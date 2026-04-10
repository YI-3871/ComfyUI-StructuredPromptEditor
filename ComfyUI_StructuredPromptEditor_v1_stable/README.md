# ComfyUI-StructuredPromptEditor

一个用于 **ComfyUI** 的结构化提示词编辑节点。  
它将原本单一的大段提示词拆分为多个可单独编辑的字段，并最终合并为一条完整提示词输出，便于连接到 `CLIP Text Encode` 使用。

## 功能特点

- 结构化提示词编辑
- 固定字段顺序
- 支持多行文本输入
- 自动跳过空字段
- 输出单条合并提示词
- 适合人物图、服装图、商品图等工作流

## 字段列表

当前版本支持以下字段：

- `composition`
- `hairstyle`
- `hair_color`
- `face`
- `expression`
- `pose`
- `body`
- `top_clothing`
- `bottom_clothing`
- `lighting`
- `background`

## 输出

- `merged_prompt`（`STRING`）

节点会按固定顺序将所有非空字段合并为一条完整提示词，并输出给下游节点使用。

## 安装方法

将本仓库复制或下载到你的 ComfyUI 自定义节点目录中：

```text
ComfyUI/custom_nodes/ComfyUI_StructuredPromptEditor/
````

然后重启 ComfyUI。

## 使用方法

1. 在 ComfyUI 中添加 **结构化提示词编辑器**
2. 按需填写各个字段内容
3. 将 `merged_prompt` 输出连接到 `CLIP Text Encode` 的 `text` 输入
4. 运行工作流

## 字段顺序

当前固定合并顺序如下：

1. `composition`
2. `hairstyle`
3. `hair_color`
4. `face`
5. `expression`
6. `pose`
7. `body`
8. `top_clothing`
9. `bottom_clothing`
10. `lighting`
11. `background`

## 项目结构

```text
ComfyUI_StructuredPromptEditor/
├─ __init__.py
├─ structured_prompt_node.py
├─ README.md
└─ web/
   └─ js/
      └─ structured_prompt_editor.js
```

## 说明

这个节点的目标是提升提示词的**组织效率、修改效率和维护性**。
它适合需要长期整理、复用、迭代提示词结构的工作流。

需要注意的是，这个节点主要解决的是提示词编辑体验问题，不能替代 ControlNet、姿势控制、区域控制等硬约束方法。

## 后续计划

* 增加调试输出
* 增加正向 / 负向分离
* 增加模板功能
* 增加字段开关控制

## License

MIT

```
```
