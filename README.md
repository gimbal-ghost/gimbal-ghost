# 🕹️ Blackbox Sticks Generator 🕹️
Generate a 3d video of your transmitter sticks from blackbox flight data.

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

## 📝 License
Licensed under GPLv3.

Gimbal and stick blender model modified from Bastian Sondermann's [Blackbox Sticks Exporter 3D](https://github.com/bsondermann/BlackboxSticksExporter3D).

Blackbox files decoded using [Betaflight Blackbox Tools](https://github.com/betaflight/blackbox-tools).