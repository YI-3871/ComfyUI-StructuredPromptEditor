"""
结构化提示词编辑节点。

这个节点用于把固定顺序的多个提示词片段整理成一条完整提示词，
最终输出 1 个可直接连接到 CLIP Text Encode 的 STRING。
"""


class StructuredPromptEditorNode:
    """
    把结构化的提示词字段合并成一条完整提示词。

    这个类尽量保持原有节点名称和注册方式稳定，只扩展字段数量、
    固定字段顺序，并保留最简单稳妥的文本合并逻辑。
    """

    # 固定字段顺序：
    # 1. 决定界面中输入框的显示顺序
    # 2. 决定最终 merged_prompt 的拼接顺序
    FIELD_ORDER = (
        "composition",
        "hairstyle",
        "hair_color",
        "face",
        "expression",
        "pose",
        "body",
        "top_clothing",
        "bottom_clothing",
        "lighting",
        "background",
    )

    @classmethod
    def INPUT_TYPES(cls):
        """
        定义节点输入。

        所有字段都使用 STRING,并开启 multiline=True,
        这样 ComfyUI 会为每个字段创建多行文本输入框。
        """
        required_inputs = {}
        for field_name in cls.FIELD_ORDER:
            required_inputs[field_name] = ("STRING", {"default": "", "multiline": True})

        return {"required": required_inputs}

    # 输出仍然保持为 1 个 STRING，便于直接接到 CLIP Text Encode 的 text 输入。
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("merged_prompt",)

    # ComfyUI 会调用这个方法执行节点逻辑。
    FUNCTION = "merge_prompt"

    # 尽量保持原有分类不变。
    CATEGORY = "YI/文本工具"

    @staticmethod
    def _clean_text(value):
        """
        清理单个输入内容。

        规则：
        1. None 视为空字符串
        2. 统一转成字符串
        3. 去掉首尾空白
        """
        if value is None:
            return ""
        return str(value).strip()

    def _build_ordered_parts(self, **kwargs):
        """
        按固定字段顺序取值并清理，方便后续统一拼接。
        """
        ordered_parts = []
        for field_name in self.FIELD_ORDER:
            ordered_parts.append(self._clean_text(kwargs.get(field_name, "")))
        return ordered_parts

    def merge_prompt(
        self,
        composition="",
        hairstyle="",
        hair_color="",
        face="",
        expression="",
        pose="",
        body="",
        top_clothing="",
        bottom_clothing="",
        lighting="",
        background="",
    ):
        """
        按固定顺序合并 11 个输入框的内容。

        合并规则：
        1. 每个字段先去掉首尾空格
        2. 空字符串直接跳过
        3. 非空字段按固定顺序拼接
        4. 使用中文逗号连接
        5. 不保留字段标签名
        6. 全部为空时输出空字符串
        """
        ordered_parts = self._build_ordered_parts(
            composition=composition,
            hairstyle=hairstyle,
            hair_color=hair_color,
            face=face,
            expression=expression,
            pose=pose,
            body=body,
            top_clothing=top_clothing,
            bottom_clothing=bottom_clothing,
            lighting=lighting,
            background=background,
        )

        # 过滤掉清理后为空的字段，避免多余分隔符。
        non_empty_parts = [part for part in ordered_parts if part]

        # 如果全部为空，join([]) 会自然得到空字符串。
        merged_prompt = "，".join(non_empty_parts)

        # ComfyUI 节点返回值必须是元组。
        return (merged_prompt,)


NODE_CLASS_MAPPINGS = {
    "StructuredPromptEditorNode": StructuredPromptEditorNode,
}


NODE_DISPLAY_NAME_MAPPINGS = {
    "StructuredPromptEditorNode": "结构化提示词编辑器",
}
