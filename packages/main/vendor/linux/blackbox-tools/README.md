# Blackbox flight data recorder tools

## Introduction

These tools allow you to convert flight data logs recorded by Cleanflight's Blackbox feature into CSV files
(comma-separated values) for analysis, or into a series of PNG files which you could turn into a video.

You can download the latest executable versions of these tools for Mac or Windows from the "releases" tab above. If
you're running Linux, you must build the tools from source (instructions are further down this page).

## Using the blackbox_decode tool

This tool converts a flight log binary ".TXT" file into CSV format. Typical usage (from the command line) would be like:

```bash
blackbox_decode LOG00001.TXT
```

That'll decode the log to `LOG00001.01.csv` and print out some statistics about the log. If you're using Windows, you
can drag and drop your log files onto `blackbox_decode` and they'll all be decoded. Please note that you shouldn't
discard the original ".TXT" file, because it is required as input for other tools like the PNG image renderer.

If your log file contains GPS data then a ".gpx" file will also be produced. This file can be opened in Google Earth
or some other GPS mapping software for analysis. This feature is experimental.

Use the `--help` option to show more details:

```text
Blackbox flight log decoder by Nicholas Sherlock

Usage:
     blackbox_decode [options] <input logs>

Options:
   --help                   This page
   --index <num>            Choose the log from the file that should be decoded (or omit to decode all)
   --limits                 Print the limits and range of each field
   --stdout                 Write log to stdout instead of to a file
   --unit-amperage <unit>   Current meter unit (raw|mA|A), default is A (amps)
   --unit-frame-time <unit> Frame timestamp unit (us|s), default is us (microseconds)
   --unit-height <unit>     Height unit (m|cm|ft), default is cm (centimeters)
   --unit-rotation <unit>   Rate of rotation unit (raw|deg/s|rad/s), default is raw
   --unit-acceleration <u>  Acceleration unit (raw|g|m/s2), default is raw
   --unit-gps-speed <unit>  GPS speed unit (mps|kph|mph), default is mps (meters per second)
   --unit-vbat <unit>       Vbat unit (raw|mV|V), default is V (volts)
   --merge-gps              Merge GPS data into the main CSV log file instead of writing it separately
   --simulate-current-meter Simulate a virtual current meter using throttle data
   --sim-current-meter-scale   Override the FC's settings for the current meter simulation
   --sim-current-meter-offset  Override the FC's settings for the current meter simulation
   --simulate-imu           Compute tilt/roll/heading fields from gyro/accel/mag data
   --imu-ignore-mag         Ignore magnetometer data when computing heading
   --declination <val>      Set magnetic declination in degrees.minutes format (e.g. -12.58 for New York)
   --declination-dec <val>  Set magnetic declination in decimal degrees (e.g. -12.97 for New York)
   --debug                  Show extra debugging information
   --raw                    Don't apply predictions to fields (show raw field deltas)
```

## License

This project is licensed under GPLv3.