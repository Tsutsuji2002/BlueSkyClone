using BSkyClone.Constants;

namespace BSkyClone.Services.ML;

/// <summary>
/// Maps ImageNet-1000 class indices to BlueSky feed categories.
/// Based on standard ImageNet class ordering used by MobileNetV2, ResNet, etc.
/// Reference: https://gist.github.com/yrevar/942d3a0ac09ec9e5eb3a
/// </summary>
public static class ImageNetCategoryMapper
{
    /// <summary>
    /// Maps an ImageNet class index (0-999) to a BlueSky category constant.
    /// Returns "neutral" if the class doesn't map to any BlueSky category.
    /// </summary>
    public static string MapToCategory(int classIndex)
    {
        // --- NATURE: Animals, Plants, Landscapes ---
        // Birds (7-24)
        if (classIndex >= 7 && classIndex <= 24) return PostCategoryConstants.Nature;
        // Fish (0-6, 389-397)
        if (classIndex >= 0 && classIndex <= 6) return PostCategoryConstants.Nature;
        if (classIndex >= 389 && classIndex <= 397) return PostCategoryConstants.Nature;
        // Reptiles & Amphibians (25-68)
        if (classIndex >= 25 && classIndex <= 68) return PostCategoryConstants.Nature;
        // Mammals - Dogs (151-275)
        if (classIndex >= 151 && classIndex <= 275) return PostCategoryConstants.Nature;
        // Mammals - Cats (281-285)
        if (classIndex >= 281 && classIndex <= 285) return PostCategoryConstants.Nature;
        // Mammals - Bears, Monkeys, etc. (286-385)
        if (classIndex >= 286 && classIndex <= 385) return PostCategoryConstants.Nature;
        // Insects (300-321)
        if (classIndex >= 300 && classIndex <= 321) return PostCategoryConstants.Nature;
        // Flowers & Plants (Daisy=985, Rose=987, Sunflower=988)
        if (classIndex >= 985 && classIndex <= 988) return PostCategoryConstants.Nature;
        // Geological/Natural scenes
        if (classIndex == 970) return PostCategoryConstants.Nature; // alp
        if (classIndex == 971) return PostCategoryConstants.Nature; // bubble
        if (classIndex == 972) return PostCategoryConstants.Nature; // cliff
        if (classIndex == 973) return PostCategoryConstants.Nature; // coral reef
        if (classIndex == 974) return PostCategoryConstants.Nature; // geyser
        if (classIndex == 975) return PostCategoryConstants.Nature; // lakeside
        if (classIndex == 976) return PostCategoryConstants.Nature; // promontory
        if (classIndex == 977) return PostCategoryConstants.Nature; // sandbar
        if (classIndex == 978) return PostCategoryConstants.Nature; // seashore
        if (classIndex == 979) return PostCategoryConstants.Nature; // valley
        if (classIndex == 980) return PostCategoryConstants.Nature; // volcano

        // --- FOOD: Food items, Kitchen tools ---
        if (classIndex == 924) return PostCategoryConstants.Food; // guacamole
        if (classIndex == 925) return PostCategoryConstants.Food; // consomme
        if (classIndex == 926) return PostCategoryConstants.Food; // hotpot
        if (classIndex == 927) return PostCategoryConstants.Food; // trifle
        if (classIndex == 928) return PostCategoryConstants.Food; // ice cream
        if (classIndex == 929) return PostCategoryConstants.Food; // ice lolly
        if (classIndex == 930) return PostCategoryConstants.Food; // french loaf
        if (classIndex == 931) return PostCategoryConstants.Food; // bagel
        if (classIndex == 932) return PostCategoryConstants.Food; // pretzel
        if (classIndex == 933) return PostCategoryConstants.Food; // cheeseburger
        if (classIndex == 934) return PostCategoryConstants.Food; // hotdog
        if (classIndex == 935) return PostCategoryConstants.Food; // mashed potato
        if (classIndex == 936) return PostCategoryConstants.Food; // head cabbage
        if (classIndex == 937) return PostCategoryConstants.Food; // broccoli
        if (classIndex == 938) return PostCategoryConstants.Food; // cauliflower
        if (classIndex == 939) return PostCategoryConstants.Food; // zucchini
        if (classIndex == 940) return PostCategoryConstants.Food; // spaghetti squash
        if (classIndex == 941) return PostCategoryConstants.Food; // acorn squash
        if (classIndex == 942) return PostCategoryConstants.Food; // butternut squash
        if (classIndex == 943) return PostCategoryConstants.Food; // cucumber
        if (classIndex == 944) return PostCategoryConstants.Food; // artichoke
        if (classIndex == 945) return PostCategoryConstants.Food; // bell pepper
        if (classIndex == 946) return PostCategoryConstants.Food; // cardoon
        if (classIndex == 947) return PostCategoryConstants.Food; // mushroom
        if (classIndex == 948) return PostCategoryConstants.Food; // Granny Smith (apple)
        if (classIndex == 949) return PostCategoryConstants.Food; // strawberry
        if (classIndex == 950) return PostCategoryConstants.Food; // orange
        if (classIndex == 951) return PostCategoryConstants.Food; // lemon
        if (classIndex == 952) return PostCategoryConstants.Food; // fig
        if (classIndex == 953) return PostCategoryConstants.Food; // pineapple
        if (classIndex == 954) return PostCategoryConstants.Food; // banana
        if (classIndex == 955) return PostCategoryConstants.Food; // jackfruit
        if (classIndex == 956) return PostCategoryConstants.Food; // custard apple
        if (classIndex == 957) return PostCategoryConstants.Food; // pomegranate
        if (classIndex == 958) return PostCategoryConstants.Food; // carbonara
        if (classIndex == 959) return PostCategoryConstants.Food; // dough
        if (classIndex == 960) return PostCategoryConstants.Food; // meat loaf
        if (classIndex == 961) return PostCategoryConstants.Food; // pizza
        if (classIndex == 962) return PostCategoryConstants.Food; // pot pie
        if (classIndex == 963) return PostCategoryConstants.Food; // burrito
        if (classIndex == 964) return PostCategoryConstants.Food; // espresso
        if (classIndex == 965) return PostCategoryConstants.Food; // cup (coffee)
        // Kitchen tools (close to food)
        if (classIndex == 567) return PostCategoryConstants.Food; // frying pan
        if (classIndex == 766) return PostCategoryConstants.Food; // rotisserie
        if (classIndex == 828) return PostCategoryConstants.Food; // stove
        if (classIndex == 879) return PostCategoryConstants.Food; // wine bottle

        // --- TECH: Electronics, Computers, Devices ---
        if (classIndex == 481) return PostCategoryConstants.Tech; // binoculars (tech-adjacent)
        if (classIndex == 491) return PostCategoryConstants.Tech; // cash machine
        if (classIndex == 508) return PostCategoryConstants.Tech; // computer keyboard
        if (classIndex == 527) return PostCategoryConstants.Tech; // desktop computer
        if (classIndex == 528) return PostCategoryConstants.Tech; // dial telephone
        if (classIndex == 531) return PostCategoryConstants.Tech; // digital watch
        if (classIndex == 548) return PostCategoryConstants.Tech; // envelope (office)
        if (classIndex == 590) return PostCategoryConstants.Tech; // hard disc
        if (classIndex == 620) return PostCategoryConstants.Tech; // laptop
        if (classIndex == 621) return PostCategoryConstants.Tech; // projector
        if (classIndex == 664) return PostCategoryConstants.Tech; // monitor
        if (classIndex == 671) return PostCategoryConstants.Tech; // mouse (computer)
        if (classIndex == 681) return PostCategoryConstants.Tech; // notebook (laptop)
        if (classIndex == 695) return PostCategoryConstants.Tech; // padlock (security)
        if (classIndex == 707) return PostCategoryConstants.Tech; // printer
        if (classIndex == 740) return PostCategoryConstants.Tech; // power drill (tool)
        if (classIndex == 745) return PostCategoryConstants.Tech; // radio
        if (classIndex == 748) return PostCategoryConstants.Tech; // modem/router
        if (classIndex == 782) return PostCategoryConstants.Tech; // screen
        if (classIndex == 830) return PostCategoryConstants.Tech; // strainer (lab)
        if (classIndex == 851) return PostCategoryConstants.Tech; // television
        if (classIndex == 860) return PostCategoryConstants.Tech; // torch (flashlight)

        // --- GAMING: Game consoles, controllers ---
        if (classIndex == 500) return PostCategoryConstants.Gaming; // claw (arcade machine reference)
        if (classIndex == 515) return PostCategoryConstants.Gaming; // crossword puzzle
        if (classIndex == 517) return PostCategoryConstants.Gaming; // crane game
        if (classIndex == 538) return PostCategoryConstants.Gaming; // disk brake → often in racing game screenshots
        if (classIndex == 609) return PostCategoryConstants.Gaming; // joystick
        if (classIndex == 701) return PostCategoryConstants.Gaming; // pinball
        if (classIndex == 710) return PostCategoryConstants.Gaming; // pool table
        if (classIndex == 983) return PostCategoryConstants.Gaming; // jigsaw puzzle

        // --- MUSIC: Musical instruments ---
        if (classIndex == 401) return PostCategoryConstants.Music; // accordion
        if (classIndex == 402) return PostCategoryConstants.Music; // harmonica
        if (classIndex == 420) return PostCategoryConstants.Music; // banjo
        if (classIndex == 486) return PostCategoryConstants.Music; // cello
        if (classIndex == 497) return PostCategoryConstants.Music; // church organ
        if (classIndex == 513) return PostCategoryConstants.Music; // cornet
        if (classIndex == 541) return PostCategoryConstants.Music; // drum
        if (classIndex == 542) return PostCategoryConstants.Music; // drumstick
        if (classIndex == 546) return PostCategoryConstants.Music; // electric guitar
        if (classIndex == 558) return PostCategoryConstants.Music; // flute
        if (classIndex == 566) return PostCategoryConstants.Music; // French horn
        if (classIndex == 579) return PostCategoryConstants.Music; // grand piano
        if (classIndex == 593) return PostCategoryConstants.Music; // harmonica
        if (classIndex == 594) return PostCategoryConstants.Music; // harp
        if (classIndex == 642) return PostCategoryConstants.Music; // marimba
        if (classIndex == 683) return PostCategoryConstants.Music; // oboe
        if (classIndex == 684) return PostCategoryConstants.Music; // ocarina
        if (classIndex == 699) return PostCategoryConstants.Music; // panpipe
        if (classIndex == 776) return PostCategoryConstants.Music; // saxophone
        if (classIndex == 815) return PostCategoryConstants.Music; // steel drum
        if (classIndex == 847) return PostCategoryConstants.Music; // trombone
        if (classIndex == 862) return PostCategoryConstants.Music; // trumpet
        if (classIndex == 875) return PostCategoryConstants.Music; // upright piano
        if (classIndex == 889) return PostCategoryConstants.Music; // violin

        // --- SPORTS ---
        if (classIndex == 722) return PostCategoryConstants.Sports; // ping-pong ball
        if (classIndex == 747) return PostCategoryConstants.Sports; // puck (hockey)
        if (classIndex == 768) return PostCategoryConstants.Sports; // rugby ball
        if (classIndex == 770) return PostCategoryConstants.Sports; // running shoe
        if (classIndex == 795) return PostCategoryConstants.Sports; // ski
        if (classIndex == 796) return PostCategoryConstants.Sports; // ski mask
        if (classIndex == 801) return PostCategoryConstants.Sports; // soccer ball
        if (classIndex == 802) return PostCategoryConstants.Sports; // golf ball
        if (classIndex == 805) return PostCategoryConstants.Sports; // snowmobile
        if (classIndex == 852) return PostCategoryConstants.Sports; // tennis ball
        if (classIndex == 981) return PostCategoryConstants.Sports; // ballplayer (baseball)
        if (classIndex == 982) return PostCategoryConstants.Sports; // scuba diver

        // --- PHOTOGRAPHY: Camera equipment ---
        if (classIndex == 732) return PostCategoryConstants.Photography; // Polaroid camera
        if (classIndex == 759) return PostCategoryConstants.Photography; // reflex camera
        if (classIndex == 847) return PostCategoryConstants.Photography; // tripod (also music!)

        // --- ART ---
        // No direct ImageNet class for "art", but abstract images tend to score low everywhere,
        // which is handled by the fallback URL analysis.

        // --- MOVIES: Theatrical ---
        if (classIndex == 831) return PostCategoryConstants.Movies; // stage
        if (classIndex == 648) return PostCategoryConstants.Movies; // mask/theater

        // --- SCIENCE: Lab equipment ---
        if (classIndex == 479) return PostCategoryConstants.Science; // beaker
        if (classIndex == 644) return PostCategoryConstants.Science; // magnetic compass
        if (classIndex == 753) return PostCategoryConstants.Science; // radio telescope
        if (classIndex == 813) return PostCategoryConstants.Science; // space shuttle
        if (classIndex == 819) return PostCategoryConstants.Science; // spacecraft
        if (classIndex == 846) return PostCategoryConstants.Science; // syringe
        if (classIndex == 868) return PostCategoryConstants.Science; // telescope

        // Anything else → neutral (no BlueSky category match)
        return "neutral";
    }

    /// <summary>
    /// Returns confidence-weighted category with the probability score.
    /// </summary>
    public static (string Category, float Confidence) MapWithConfidence(float[] scores)
    {
        if (scores == null || scores.Length == 0) return ("neutral", 0f);

        // Apply softmax to convert logits to probabilities
        var maxVal = scores.Max();
        var expScores = scores.Select(s => (float)Math.Exp(s - maxVal)).ToArray();
        var sumExp = expScores.Sum();
        var probabilities = expScores.Select(s => s / sumExp).ToArray();

        var topIndex = probabilities.Select((val, idx) => new { val, idx })
            .OrderByDescending(x => x.val)
            .First();

        var category = MapToCategory(topIndex.idx);
        return (category, topIndex.val);
    }
}
