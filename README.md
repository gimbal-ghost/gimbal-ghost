![Gimbal Ghost](/banner.png)

### **Gimbal Ghost is a desktop app allowing you to quickly create high quality 3D video of your gimbal sticks from your Betaflight, EmuFlight, and Rotorflight blackbox logs.**

Think stick cam, but with a ghost moving the gimbals. 😜

[See it in action here!](https://www.youtube.com/watch?v=E9Kv2TYGpKA)

Give it a whirl by downloading from the [releases page](https://github.com/gimbal-ghost/gimbal-ghost/releases).

## ⚠️ Note About Empty/Black Output Videos

Gimbal Ghost output videos use the Apple ProRes 4444 codec and will not play by default on most machines. If you play the output video files and don't see anything, you are missing this codec. Simply load the video files into your video editing application of choice (DaVinci Resolve, Adobe Premiere, etc.), and you will have no issues viewing or editing the file.

## 🚀 Motivation

I have learned the most from FPV flight videos where I can clearly see the pilot's gimbals and could then go out and try what they did in the field. The current standard of using a "Stick Cam" comes with the overhead of an extra camera, extra time in post processing and frankly an imperfect view of the gimbals--quite a barrier to entry. Wouldn't it be great if we could all easily show our stick movements in our videos?

In creating Gimbal Ghost I wanted to make posting a video with a view of your gimbal sticks the norm rather than the exception. This can only be accomplished if doing so is easy, fast, and high quality. This is my best stab at that. I welcome any feedback you may have and any contributions if you're willing.

Go out and fly! And if you do post video for others, add Gimbal Ghost to it so we all can learn from you!

## ✨ Special Thanks

I owe a special thanks to Bastian Sondermann and the 3D models in his [BlackboxSticksExporter3D](https://github.com/bsondermann/BlackboxSticksExporter3D) tool. The 3D models in Gimbal Ghost are created from the 3D models from Bastian. I used his tool for quite some time in my search for an answer to this problem. In many ways his tool was the inspiration for this one.

## 🤟 Donate

If you find Gimbal Ghost helpful, consider dropping some ETH/BTC to `jdavidson.eth` or donating via PayPal [here](https://paypal.me/jwaynedavidson). Thanks for your support!

## 🏗️ Architecture

For those interested, the Gimbal Ghost's process of creating a 3D video of transmitter sticks from blackbox data is comprised of three high levels steps:

1. Decode:

   - Blackbox files are decoded into CSV files using the betaflight blackbox_decode CLI tool.
   - This results in a CSV file for each time the drone is armed.

1. Parse:

   - Each CSV file is transformed into a set of instructions for FFmpeg to use in assembling the rendered video.
   - The high frequency transmitter input data (roll, pitch, yaw, throttle) from the CSVs are downsampled to the user provided output video frames per second.
   - The transmitter input data for each frame of video is resolved to an frame for the left and right gimbals by using the prerendered gimbal's `gg-manifest.json` file (see: [gg-default-gimbals repo](https://github.com/gimbal-ghost/gg-default-gimbals)).
   - The resolved frame paths are compiled into a left and right demux `.txt` file for use by FFmpeg in rendering.

1. Render:
   - The two demux `.txt` files are fed to FFmpeg as separte input streams using two concat demuxers.
   - The left gimbal input stream is padded with transparent pixels to provide spacing from the right gimbal in the final video.
   - The padded left gimbal stream is then horizontally stacked with the right gimbal input stream giving a top down view of the tranmitter with left and right gimbals.
   - The resulting output stream is encoded in a format with transparency (Apple Pro res 4444) to arrive at a final video that can be overlayed on flight footage.

## 📝 License

Licensed under GPLv3.

Blackbox files decoded using [Betaflight Blackbox Tools](https://github.com/betaflight/blackbox-tools).

3D Gimbal model from [BlackboxSticksExporter3D](https://github.com/bsondermann/BlackboxSticksExporter3D).
