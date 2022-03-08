# 👻 Gimbal Ghost
Generate a 3d video of your transmitter gimbal sticks from blackbox flight data.

Say goodbye to the stick cam that takes up real estate in your video. It's like a ghost is moving your transmitter gimbals for you.

## 💻 Local Development
The following dependencies will be needed to develop locally:
* [Blender v2.83 LTS](https://www.blender.org/download/lts/2-93/)

### Architecture
The process of creating a 3d video of transmitter sticks from blackbox data is comprised of 4 steps:
1. Prerender:
    * All possible stick positions for a single gimbal are prerendered using a blender model and python prerender script.
    * The prerender script moves the gimble in the x and y directions within a position range of -500 to 500 where center stick is represented by `(0, 0)`, upper right is `(500, 500)` and lower left if `(-500, -500)`.
    * The prerender script then uses blender to render a frame to a RBGA `.png` image file where the name of the file is the position of the stick in that frame, e.g. `-450_70.png`.
    * To save on file space, the prerender script subsamples the posible stick positions only rendering an image for positions in increments of 10 (adjustable in script).
    * Information about the prerendered stick frames is stored in a `gg-manifest.json` file and includes information about the image locations, x, y ranges and step size.

2. Decode:
    * Blackbox files are decoded into CSV files using the betaflight blackbox_decode CLI tool.
    * This results in a CSV file for each time the drone is armed.

3. Parse:
    * Each CSV file is transformed into a set of instructions for FFmpeg to use in assembling the rendered video.
    * The high frequency transmitter input data (roll, pitch, yaw, throttle) from the CSVs are downsampled to the user provided output video frames per second.
    * The transmitter input data for each frame of video is resolved to an frame for the left and right gimbals by using the prerendered stick's `gg-manifest.json` file.
    * The resolved frame paths are compiled into a left and right demux `.txt` file for use by FFmpeg in rendering.

4. Render:
    * The two demux `.txt` files are fed to FFmpeg as separte input streams using two concat demuxers.
    * The left gimbal input stream is padded with transparent pixels to provide spacing from the right gimbal in the final video.
    * The padded left gimbal stream is then horizontally stacked with the right gimbal input stream giving a top down view of the tranmitter with left and right gimbals.
    * The resulting output stream is encoded in a format with transparency (Apple Pro res 4444) to arrive at a final video that can be overlayed on flight footage.

## 📝 License
Licensed under GPLv3.

Gimbal and stick blender model modified from Bastian Sondermann's [Blackbox Sticks Exporter 3D](https://github.com/bsondermann/BlackboxSticksExporter3D).

Blackbox files decoded using [Betaflight Blackbox Tools](https://github.com/betaflight/blackbox-tools).
