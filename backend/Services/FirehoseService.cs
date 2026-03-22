using System;
using System.Collections.Generic;
using System.IO;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;
using BSkyClone.Models;
using BSkyClone.Utilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BSkyClone.Services
{
    public class FirehoseService : BackgroundService
    {
        private readonly ILogger<FirehoseService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly string _relayUrl = "wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos";

        public FirehoseService(ILogger<FirehoseService> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("FirehoseService starting...");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var webSocket = new ClientWebSocket())
                    {
                        _logger.LogInformation("Connecting to Relay: {Url}", _relayUrl);
                        await webSocket.ConnectAsync(new Uri(_relayUrl), stoppingToken);
                        _logger.LogInformation("Connected to Firehose.");

                        await ReceiveLoop(webSocket, stoppingToken);
                    }
                }
                catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
                {
                    _logger.LogError(ex, "Firehose connection error. Retrying in 10 seconds...");
                    await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
                }
            }
        }

        private readonly SemaphoreSlim _throttler = new SemaphoreSlim(5, 5); // Max 5 concurrent DB operations for firehose

        private async Task ReceiveLoop(ClientWebSocket webSocket, CancellationToken stoppingToken)
        {
            var buffer = new byte[1024 * 1024]; // 1MB buffer
            using var ms = new MemoryStream();

            while (webSocket.State == WebSocketState.Open && !stoppingToken.IsCancellationRequested)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), stoppingToken);
                if (result.MessageType == WebSocketMessageType.Close) break;

                await ms.WriteAsync(buffer, 0, result.Count, stoppingToken);

                if (result.EndOfMessage)
                {
                    var messageData = ms.ToArray();
                    ms.SetLength(0); // Reset for next message
                    
                    _logger.LogDebug("Received full firehose message, size: {Size}", messageData.Length);

                    _ = Task.Run(async () => {
                        await _throttler.WaitAsync(stoppingToken); // Limit concurrency to prevent SQL pool exhaustion
                        try {
                            await ProcessMessageAsync(messageData);
                        } catch (Exception ex) {
                            _logger.LogError(ex, "Error processing firehose message");
                        } finally {
                            _throttler.Release();
                        }
                    }, stoppingToken);
                }
            }
        }

        private async Task ProcessMessageAsync(byte[] data)
        {
            using var ms = new MemoryStream(data);
            
            // AT Protocol Firehose Framing: [Header CBOR] [Body CBOR]
            // We need to decode them sequentially from the stream
            var header = CborUtils.DecodeFromStream(ms) as Dictionary<string, object>;
            var body = CborUtils.DecodeFromStream(ms) as Dictionary<string, object>;

            if (header == null) {
                _logger.LogWarning("Firehose message header is null or not a dictionary");
                return;
            }

            _logger.LogTrace("Processing firehose message type: {Type}", header.ContainsKey("t") ? header["t"] : "unknown");

            if (header.TryGetValue("t", out var t) && t?.ToString() == "#commit")
            {
                await HandleCommitEventAsync(body);
            }
            else if (header.TryGetValue("t", out var type))
            {
                if (type?.ToString() == "#handle")
                {
                    var did = body?.ContainsKey("did") == true ? body["did"]?.ToString() : "unknown";
                    _logger.LogInformation("Firehose: Handle update for {Did}", did);
                }
            }
        }


        private async Task HandleCommitEventAsync(Dictionary<string, object> body)
        {
            // body["blocks"] is a byte[] containing a CAR file
            // body["ops"] is a list of operations (create/update/delete)
            // body["repo"] is the DID
            
            if (!body.ContainsKey("repo") || body["repo"] == null) return;
            var did = body["repo"].ToString();
            
            var blocks = body.ContainsKey("blocks") ? body["blocks"] as byte[] : null;
            var ops = body.ContainsKey("ops") ? body["ops"] as List<object> : null;

            if (did != null && blocks != null && ops != null)
            {
                // [RELIABILITY] DID-Aware Filter:
                // Always process events from locally registered users.
                // Apply 30% sampling ONLY for unknown remote DIDs to prevent DB saturation.
                bool isLocalUser = false;
                try
                {
                    using var checkScope = _serviceProvider.CreateScope();
                    var db = checkScope.ServiceProvider.GetRequiredService<BSkyDbContext>();
                    isLocalUser = await db.Users.AnyAsync(u => u.Did == did);
                }
                catch { /* Non-critical: fall through to sampling */ }

                if (!isLocalUser && new Random().Next(0, 100) > 30)
                {
                    _logger.LogTrace("Firehose: Probabilistically skipping post from unknown remote {Did}.", did);
                    return;
                }

                using var scope = _serviceProvider.CreateScope();
                var postService = scope.ServiceProvider.GetRequiredService<IPostService>();
                
                // Extract blocks from CAR
                using var carMs = new MemoryStream(blocks);
                var extractedBlocks = await CarUtils.ReadBlocksAsync(carMs);
                
                // Map ops to records
                foreach (var opObj in ops)
                {
                    var op = opObj as Dictionary<string, object>;
                    if (op == null) continue;

                    var action = op.ContainsKey("action") ? op["action"]?.ToString() : null;
                    var path = op.ContainsKey("path") ? op["path"]?.ToString() : null;
                    var cid = op.ContainsKey("cid") ? op["cid"]?.ToString() : null;

                    if (action == "create" && path != null && path.StartsWith("app.bsky.feed.post/") && cid != null)
                    {
                        _logger.LogTrace("Firehose: Looking for CID {Cid}. Found {Count} blocks.", cid, extractedBlocks.Count);
                        var block = extractedBlocks.Find(b => b.Cid == cid);
                        if (block.Data != null)
                        {
                            _logger.LogDebug("Firehose: Found record for post {Path}, ingesting...", path);
                            await postService.ProcessRemotePostAsync(did, path, cid, block.Data);
                        }
                        else 
                        {
                            _logger.LogWarning("Firehose: Could not find block data for post CID {Cid}", cid);
                        }
                    }
                    // Handle remote Like records targeting local posts
                    else if (action == "create" && path != null && path.StartsWith("app.bsky.feed.like/") && cid != null)
                    {
                        var block = extractedBlocks.Find(b => b.Cid == cid);
                        if (block.Data != null)
                        {
                            var record = CborUtils.Decode(block.Data) as Dictionary<string, object>;
                            if (record != null && record.TryGetValue("subject", out var subjectObj) 
                                && subjectObj is Dictionary<string, object> subject
                                && subject.TryGetValue("uri", out var subjectUri))
                            {
                                await postService.IncrementRemoteInteractionAsync(subjectUri?.ToString(), "like", +1);
                            }
                        }
                    }
                    // Handle remote Repost records targeting local posts
                    else if (action == "create" && path != null && path.StartsWith("app.bsky.graph.repost/") && cid != null)
                    {
                        var block = extractedBlocks.Find(b => b.Cid == cid);
                        if (block.Data != null)
                        {
                            var record = CborUtils.Decode(block.Data) as Dictionary<string, object>;
                            if (record != null && record.TryGetValue("subject", out var subjectObj) 
                                && subjectObj is Dictionary<string, object> subject
                                && subject.TryGetValue("uri", out var subjectUri))
                            {
                                await postService.IncrementRemoteInteractionAsync(subjectUri?.ToString(), "repost", +1);
                            }
                        }
                    }
                    // Handle deletions
                    else if (action == "delete" && path != null)
                    {
                        if (path.StartsWith("app.bsky.feed.like/"))
                            await postService.IncrementRemoteInteractionAsync(null, "like", -1, did, path);
                        else if (path.StartsWith("app.bsky.graph.repost/"))
                            await postService.IncrementRemoteInteractionAsync(null, "repost", -1, did, path);
                    }
                }
            }
        }
    }
}
