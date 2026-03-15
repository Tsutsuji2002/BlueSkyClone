using System;
using System.Collections.Generic;
using System.IO;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;
using BSkyClone.Utilities;
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

        private async Task ReceiveLoop(ClientWebSocket webSocket, CancellationToken stoppingToken)
        {
            var buffer = new byte[1024 * 1024]; // 1MB buffer
            while (webSocket.State == WebSocketState.Open && !stoppingToken.IsCancellationRequested)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), stoppingToken);
                if (result.MessageType == WebSocketMessageType.Close) break;

                // Firehose messages can be multi-part, but ClientWebSocket.ReceiveAsync might not return the whole message in one call.
                // However, for simplicity in this initial version, we assume small enough messages OR we handle accumulation.
                if (result.EndOfMessage)
                {
                    var messageData = new byte[result.Count];
                    Array.Copy(buffer, messageData, result.Count);
                    
                    _ = Task.Run(async () => {
                        try {
                            await ProcessMessageAsync(messageData);
                        } catch (Exception ex) {
                            _logger.LogError(ex, "Error processing firehose message");
                        }
                    });
                }
                else 
                {
                    // Accumulation logic would go here if messages exceed 1MB
                    _logger.LogWarning("Received partial message too large for 1MB buffer. Skipping for now.");
                    // In a production environment, we should use a MemoryStream to accumulate.
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

            if (header == null || body == null) return;
            
            // Firehose header typically uses 't' for the type string
            var type = header.ContainsKey("t") ? header["t"].ToString() : ""; 

            if (type == "#commit")
            {
                await HandleCommitEventAsync(body);
            }
            else if (type == "#handle")
            {
                _logger.LogInformation("Firehose: Handle update for {Did}", body["did"]);
            }
        }


        private async Task HandleCommitEventAsync(Dictionary<string, object> body)
        {
            // body["blocks"] is a byte[] containing a CAR file
            // body["ops"] is a list of operations (create/update/delete)
            // body["repo"] is the DID
            
            var did = body["repo"].ToString();
            var blocks = body["blocks"] as byte[];
            var ops = body["ops"] as List<object>;

            if (blocks != null && ops != null)
            {
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

                    var action = op["action"].ToString();
                    var path = op["path"].ToString(); // e.g., app.bsky.feed.post/tid
                    var cid = op.ContainsKey("cid") ? op["cid"].ToString() : null;

                    if (action == "create" && path.StartsWith("app.bsky.feed.post/") && cid != null)
                    {
                        // Find the record data in extracted blocks
                        var block = extractedBlocks.Find(b => b.Cid == cid);
                        if (block.Data != null)
                        {
                            // Ingest into database
                            await postService.ProcessRemotePostAsync(did, path, cid, block.Data);
                        }
                    }
                }
            }
        }
    }
}
