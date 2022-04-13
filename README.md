# 👻 Gimbal Ghost
Generate a 3d video of your transmitter gimbal sticks from blackbox flight data.

Say goodbye to the stick cam that takes up real estate in your video. It's like a ghost is moving your transmitter gimbals for you.

## 🏗️ Architecture
The process of creating a 3d video of transmitter sticks from blackbox data is comprised of 3 steps:

1. Decode:
    * Blackbox files are decoded into CSV files using the betaflight blackbox_decode CLI tool.
    * This results in a CSV file for each time the drone is armed.

1. Parse:
    * Each CSV file is transformed into a set of instructions for FFmpeg to use in assembling the rendered video.
    * The high frequency transmitter input data (roll, pitch, yaw, throttle) from the CSVs are downsampled to the user provided output video frames per second.
    * The transmitter input data for each frame of video is resolved to an frame for the left and right gimbals by using the prerendered gimbal's `gg-manifest.json` file (see: [gg-default-gimbals repo](https://github.com/gimbal-ghost/gg-default-gimbals)).
    * The resolved frame paths are compiled into a left and right demux `.txt` file for use by FFmpeg in rendering.

1. Render:
    * The two demux `.txt` files are fed to FFmpeg as separte input streams using two concat demuxers.
    * The left gimbal input stream is padded with transparent pixels to provide spacing from the right gimbal in the final video.
    * The padded left gimbal stream is then horizontally stacked with the right gimbal input stream giving a top down view of the tranmitter with left and right gimbals.
    * The resulting output stream is encoded in a format with transparency (Apple Pro res 4444) to arrive at a final video that can be overlayed on flight footage.

## 📝 License
Licensed under GPLv3.

Blackbox files decoded using [Betaflight Blackbox Tools](https://github.com/betaflight/blackbox-tools).
