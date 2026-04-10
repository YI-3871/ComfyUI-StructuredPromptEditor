"""
ComfyUI 自定义节点入口文件。

ComfyUI 在扫描 custom_nodes 目录时，会优先读取每个仓库下的 __init__.py，
并从这里获取节点注册信息，所以这里需要把节点映射和前端目录一起导出。
"""

from .structured_prompt_node import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS


# 这里使用标准的 WEB_DIRECTORY 方式加载最小前端扩展，
# 只用于让多行 STRING 输入框的字段标签固定显示在输入框外部。
WEB_DIRECTORY = "./web"


__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
