import bpy

# Utility function to convert x, y range into range of stick motion
def scale(initialValue, initialMin, initialMax, finalMin, finalMax):
    initialRange = initialMax - initialMin
    finalRange = finalMax - finalMin
    fraction = (initialValue - initialMin) / initialRange
    finalValue = (fraction * finalRange) + finalMin
    return finalValue

frame = 0
Gimbal = bpy.data.objects["Gimbal"]
Stick = bpy.data.objects["Stick"]
DEFLECTION_RADIANS = 0.436
MIN_ROTATION = -DEFLECTION_RADIANS
MAX_ROTATION = DEFLECTION_RADIANS
MOVEMENT_STOPS = 5

# Animate the stick accross all positions by scanning from left to right
for gimbal_pos in range(1, MOVEMENT_STOPS):
    # Generate keyframe for start of the stick scan
    bpy.context.scene.frame_set(frame)
    Gimbal.rotation_euler = [0, 0, 0]
    Stick.rotation_euler = [0, 0, 0]
    Gimbal.rotation_euler.rotate_axis("X", scale(gimbal_pos, 1, MOVEMENT_STOPS, MIN_ROTATION, MAX_ROTATION))
    Stick.rotation_euler.rotate_axis("Y", MIN_ROTATION)
    Gimbal.keyframe_insert(data_path="rotation_euler", index=-1)
    Stick.keyframe_insert(data_path="rotation_euler", index=-1)

    # Generate keyframe for end of stick scan
    frame += MOVEMENT_STOPS
    bpy.context.scene.frame_set(frame)
    Stick.rotation_euler = [0, 0, 0]
    # Gimbal.rotation_euler.rotate_axis("X", scale(gimbal_pos, 1, MOVEMENT_STOPS, MIN_ROTATION, MAX_ROTATION))
    Stick.rotation_euler.rotate_axis("Y", MAX_ROTATION)
    Gimbal.keyframe_insert(data_path="rotation_euler", index=-1)
    Stick.keyframe_insert(data_path="rotation_euler", index=-1)

    # Move frame for next row scan
    frame += 1