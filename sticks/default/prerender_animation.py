import bpy

# Utility function to convert x, y range into range of stick motion
def scale(initialValue, initialMin, initialMax, finalMin, finalMax):
    initialRange = initialMax - initialMin
    finalRange = finalMax - finalMin
    fraction = (initialValue - initialMin) / initialRange
    finalValue = (fraction * finalRange) + finalMin
    return finalValue

# Utility function to set last keyframe to desired interpolation mode
def set_last_keyframe_interpolation(obj, interpolation_mode):
    for fcurve in obj.animation_data.action.fcurves:
        try:
            keyframe = fcurve.keyframe_points[-1]
            keyframe.interpolation = interpolation_mode
        except: 
            pass

frame = 0
Gimbal = bpy.data.objects["Gimbal"]
Stick = bpy.data.objects["Stick"]
DEFLECTION_RADIANS = 0.520
MIN_ROTATION = -DEFLECTION_RADIANS
MAX_ROTATION = DEFLECTION_RADIANS
MOVEMENT_STOPS = 5

# Animate the stick accross all positions by scanning from left to right
for gimbal_pos in range(1, MOVEMENT_STOPS + 1):
    # Generate keyframe for start of the stick scan
    bpy.context.scene.frame_set(frame)
    Gimbal.rotation_euler[0] = scale(gimbal_pos, 1, MOVEMENT_STOPS, MIN_ROTATION, MAX_ROTATION)
    Stick.rotation_euler[1] = MIN_ROTATION
    Gimbal.keyframe_insert(data_path="rotation_euler", index=-1)
    set_last_keyframe_interpolation(Gimbal, "CONSTANT")
    Stick.keyframe_insert(data_path="rotation_euler", index=-1)
    set_last_keyframe_interpolation(Stick, "LINEAR")

    # Generate keyframe for end of stick scan
    frame += MOVEMENT_STOPS - 1
    bpy.context.scene.frame_set(frame)
    Stick.rotation_euler = [0, 0, 0]
    Stick.rotation_euler[1] = MAX_ROTATION
    Stick.keyframe_insert(data_path="rotation_euler", index=-1)
    set_last_keyframe_interpolation(Stick, "LINEAR")

    # Move frame for next row scan
    frame += 1