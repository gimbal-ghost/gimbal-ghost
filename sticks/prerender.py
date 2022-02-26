import bpy
import os
from bpy.props import CollectionProperty
from bpy.props import StringProperty
from bpy.props import IntProperty
from bpy.types import PropertyGroup


#define special types for passing parameters
class StringValue(bpy.types.PropertyGroup):
    value: StringProperty(name="Value")
    
class IntCollection(bpy.types.PropertyGroup):
    value: CollectionProperty(type=StringValue)

#define operator class
class Multi_Render(bpy.types.Operator):
    bl_idname = "render.stick_positions"
    bl_label = "Render stick positions"

    render_directory_path: bpy.props.StringProperty(name="Directory to render into", default="//frames")
    stops: bpy.props.IntProperty(name="Number of stops (must be evenly divisible into 1000)", default=4)
    max_stick_deflection: bpy.props.FloatProperty(name="Maxium stick deflection from center, in radians", default=0.52)
    min_stick_position: bpy.props.IntProperty(name="Minimum position for stick", default=-500)
    max_stick_position: bpy.props.IntProperty(name="Maximum position for stick", default=500)
    cancelRender = None
    rendering = None
    render_queue = None
    eventTimer = None

    @staticmethod
    # Utility function to convert value from one range to another range
    def scale(initialValue, initialMin, initialMax, finalMin, finalMax):
        initialRange = initialMax - initialMin
        finalRange = finalMax - finalMin
        fraction = (initialValue - initialMin) / initialRange
        finalValue = (fraction * finalRange) + finalMin
        return finalValue

    # Rendering callback functions
    def pre_render(self, arg1, arg2):
        self.rendering = True

    def post_render(self, arg1, arg2):
        self.render_queue.pop(0)
        self.rendering = False

    def on_render_cancel(self, arg1, arg2):
        self.cancelRender = True

    def populate_render_queue(self):
        position_step_size = int((self.max_stick_position - self.min_stick_position) / self.stops)
        
        for x_pos in range(self.min_stick_position, self.max_stick_position + position_step_size, position_step_size):
            for y_pos in range(self.min_stick_position, self.max_stick_position + position_step_size, position_step_size):
                # Create a left padded file name based on stick x, y positions
                file_name = f"{x_pos}_{y_pos}.png"
                render_params = {
                    "x_rotation": self.scale(x_pos, self.min_stick_position, self.max_stick_position, -self.max_stick_deflection, self.max_stick_deflection),
                    "y_rotation": self.scale(y_pos, self.min_stick_position, self.max_stick_position, self.max_stick_deflection, -self.max_stick_deflection),
                    "output_file_path": os.path.join(self.render_directory_path, file_name)
                }
                self.render_queue.append(render_params)

    # Main operator function called when executed
    def execute(self, context):
        self.cancelRender = False
        self.rendering = False
        self.render_queue = []
        
        self.populate_render_queue()
                      
        # Attach rendering callback functions
        bpy.app.handlers.render_pre.append(self.pre_render)
        bpy.app.handlers.render_post.append(self.post_render)
        bpy.app.handlers.render_cancel.append(self.on_render_cancel)

        # Create a timer to check if rendering is done
        self.eventTimer = context.window_manager.event_timer_add(0.1, window=context.window)
        
        #register this as running in background 
        context.window_manager.modal_handler_add(self)
        return {"RUNNING_MODAL"}

    # Called anytime there is an event
    def modal(self, context, event):
        if event.type == 'TIMER':                                 
            # Check if render is done or cancelled and finish if so
            if not self.render_queue or self.cancelRender is True:
                self.dispose(context)
                
                self.report({"INFO"},"Render stick positions complete!")
                return {"FINISHED"} 

            # We are not rendering, then render next in queue
            elif self.rendering is False: 
                render_params = self.render_queue[0]

                Gimbal = bpy.data.objects["Gimbal"]
                Stick = bpy.data.objects["Stick"]
                
                Gimbal.rotation_euler[0] = render_params.get("y_rotation")
                Stick.rotation_euler[1] = render_params.get("x_rotation")
                
                bpy.context.scene.render.filepath = render_params.get("output_file_path")
                
                bpy.ops.render.render(write_still=True)

        return {"PASS_THROUGH"}

    # Clean up when done
    def dispose(self, context):
        bpy.app.handlers.render_pre.remove(self.pre_render)
        bpy.app.handlers.render_post.remove(self.post_render)
        bpy.app.handlers.render_cancel.remove(self.on_render_cancel)
        
        context.window_manager.event_timer_remove(self.eventTimer)

bpy.utils.register_class(Multi_Render)

bpy.context.scene.render.image_settings.file_format = 'PNG'
bpy.context.scene.render.image_settings.color_mode = 'RGBA'
bpy.context.scene.render.use_overwrite = True
bpy.context.scene.render.image_settings.compression = 100

bpy.ops.render.stick_positions(stops=100)