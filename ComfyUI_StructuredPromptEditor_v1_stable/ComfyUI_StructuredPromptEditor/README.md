# 结构化提示词编辑器

## 1. 节点作用说明

这是一个 ComfyUI 自定义节点，用来把常用人物提示词拆成 11 个固定字段分别编辑，再合并成 1 条完整提示词输出。

节点最终只输出 1 个 `STRING`，输出名为 `merged_prompt`，可以直接连接到 `CLIP Text Encode` 的 `text` 输入。

这个节点适合长期使用的原因是：

- 字段顺序固定，便于形成稳定写词习惯
- 每个字段独立编辑，不需要反复在整段提示词里查找
- 最终仍然输出普通提示词字符串，兼容现有工作流

## 2. 当前 11 个字段及含义

当前版本固定提供以下 11 个多行文本输入框：

1. `composition`
   画面构图、镜头远近、取景方式。
2. `hairstyle`
   发型样式，例如双马尾、长卷发、短发。
3. `hair_color`
   发色描述，例如银发、黑发、渐变发色。
4. `face`
   五官、脸型、脸部细节。
5. `expression`
   表情和情绪状态。
6. `pose`
   姿势、动作、站姿、手部动作。
7. `body`
   身材和整体体态。
8. `top_clothing`
   上装、外套、领口、袖子等。
9. `bottom_clothing`
   下装、裙子、裤子、袜子、鞋子等。
10. `lighting`
    光线、氛围光、环境光。
11. `background`
    背景场景、环境、布景元素。

## 3. 字段固定排序说明

节点界面中的输入顺序和最终输出顺序都固定为：

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

这个顺序不会在运行时自动改变。

## 4. 当前两列布局说明

当前前端布局已经改为两列显示，顺序如下：

1. 第一行：`composition` | `hairstyle`
2. 第二行：`hair_color` | `face`
3. 第三行：`expression` | `pose`
4. 第四行：`body` | `top_clothing`
5. 第五行：`bottom_clothing` | `lighting`
6. 第六行：`background` 横跨两列

这样做的目的有两个：

- 节点宽度适当增加后，整体高度明显比单列更短
- 常一起编辑的字段可以左右对照，更适合长期微调

## 5. 为什么 `background` 单独占最后一行

`background` 往往比其他字段更容易写成长句，内容也更接近完整场景描述。

把它单独放在最后一行并横跨两列，有这些好处：

- 避免背景文本过长时把旁边字段挤得太窄
- 更符合“人物主体写完，再补环境”的阅读和编辑顺序
- 背景作为收尾字段，视觉上也更清晰

## 6. 文本合并规则

节点执行时会按以下规则生成 `merged_prompt`：

1. 每个字段先执行首尾空白清理，也就是 `strip()`
2. 空字符串直接跳过
3. 非空字段严格按固定顺序拼接
4. 使用中文逗号 `，` 连接
5. 不保留字段标签名
6. 如果只有一个字段有内容，就只输出该字段
7. 如果全部为空，就输出空字符串

示例输入：

```text
composition: 半身特写
hairstyle: 长卷发
hair_color: 金发
face: 精致五官
expression: 微笑
pose:
body: 匀称身材
top_clothing: 白色衬衫
bottom_clothing: 黑色短裙
lighting: 柔和室内光
background: 咖啡馆内景
```

最终输出：

```text
半身特写，长卷发，金发，精致五官，微笑，匀称身材，白色衬衫，黑色短裙，柔和室内光，咖啡馆内景
```

## 7. 为什么原来的标签容易不可见

原来的多行 `STRING` 控件本质上还是 ComfyUI 默认文本 widget 的变体。

如果只依赖 placeholder 或依赖输入框外部额外漂浮的绝对定位标签，就会有两个常见问题：

1. 用户一输入内容，placeholder 就被覆盖，看不到字段名
2. 如果标签和 textarea 不在同一个父级坐标体系里，节点移动、缩放或折叠时就容易错位、残留或直接看不见

这也是之前“11 个字段已经出来，但标签仍不稳定”的主要原因。

## 8. 现在如何实现固定标签

当前版本的实现方式是：

1. 后端 Python 仍然只负责 11 个字段、固定顺序和 `merged_prompt` 合并逻辑
2. 前端 JS 接管该节点的可视布局
3. 原始后端 widget 只保留为数据源，并在前端中隐藏
4. 前端额外创建一个统一的 DOM 布局容器
5. 11 个字段都放进这个容器里，每个字段由：
   一个固定标签
   一个 textarea
   组成

关键点是：

- 标签和 textarea 现在处在同一个容器内
- 每个字段的 `row`、`column`、`x`、`y`、`width`、`height` 都由 JS 显式计算
- 节点移动时，整个容器一起移动，不再出现 body 级漂浮错位
- 节点折叠时，整个容器会一起隐藏
- 删除节点时，布局容器也会一起清理

## 9. 为什么需要前端 JS

新增前端 JS 是因为：

- 只靠当前后端节点定义，无法稳定做出固定标签和两列布局
- 用户要求标签必须始终显示在输入框外，而且不能再用 `document.body` 漂浮定位方案
- 使用 ComfyUI 标准 `WEB_DIRECTORY` 加载一个很小的前端扩展，是当前最稳妥的方案

这个 JS 不引入第三方库，也不改变节点执行逻辑，只接管前端显示和输入布局。

前端文件位置：

```text
ComfyUI_StructuredPromptEditor/web/js/structured_prompt_editor.js
```

加载方式：

1. `__init__.py` 导出 `WEB_DIRECTORY = "./web"`
2. ComfyUI 启动时自动加载 `web` 目录中的前端扩展

## 10. 文件结构

```text
ComfyUI_StructuredPromptEditor/
├─ __init__.py
├─ structured_prompt_node.py
├─ README.md
└─ web/
   └─ js/
      └─ structured_prompt_editor.js
```

各文件作用如下：

- `__init__.py`
  导出节点注册信息和前端目录。
- `structured_prompt_node.py`
  定义 11 个字段、固定顺序和合并逻辑。
- `web/js/structured_prompt_editor.js`
  接管两列布局、固定标签显示和 DOM 清理。
- `README.md`
  当前说明文档。

## 11. 安装与使用方式

### 安装位置

请把整个项目放在：

```text
ComfyUI/custom_nodes/ComfyUI_StructuredPromptEditor/
```

例如：

```text
H:\秋叶整合包安装与部署\ComfyUI-aki-v1.6\ComfyUI\custom_nodes\ComfyUI_StructuredPromptEditor\
```

### 启动与刷新

修改完成后建议这样刷新：

1. 完整重启 ComfyUI 后端
2. 打开或刷新 ComfyUI 前端页面

这样可以同时确保 Python 节点和前端 JS 都被重新加载。

## 12. 在 ComfyUI 中如何找到节点

重启后，在右键菜单中找到：

```text
YI/文本工具
```

节点显示名称为：

```text
结构化提示词编辑器
```

## 13. 如何连接到 CLIP Text Encode

连接方式如下：

1. 添加 `结构化提示词编辑器`
2. 添加 `CLIP Text Encode`
3. 将 `结构化提示词编辑器` 的 `merged_prompt` 输出
4. 连接到 `CLIP Text Encode` 的 `text` 输入

这样节点整理后的完整提示词会直接送入文本编码节点。

## 14. 常见问题排查

### 问题一：节点没显示

请按顺序检查：

1. 项目目录是否放在 `ComfyUI/custom_nodes/ComfyUI_StructuredPromptEditor/`
2. 是否存在 `__init__.py`
3. 是否已经完整重启 ComfyUI，而不是只刷新局部界面
4. 节点分类是否在 `YI/文本工具`
5. 节点名称是否为 `结构化提示词编辑器`

### 问题二：字段标签仍然不可见

请检查：

1. 是否已经重启 ComfyUI 后端并刷新浏览器页面
2. `__init__.py` 是否导出了 `WEB_DIRECTORY = "./web"`
3. `web/js/structured_prompt_editor.js` 是否存在
4. 浏览器控制台或 ComfyUI 启动日志里是否有前端扩展加载错误
5. 是否加载到了旧缓存页面

### 问题三：两列布局没有生效

请检查：

1. 是否真的加载到了最新的 `structured_prompt_editor.js`
2. 节点宽度是否已经被前端自动扩展
3. 是否有其他扩展改写了同一节点的 widget 布局

### 问题四：导入失败

如果启动日志里出现导入失败，请检查：

1. `__init__.py` 是否成功导入了 `structured_prompt_node.py`
2. 文件名是否保持为 `structured_prompt_node.py`
3. Python 文件是否保存为正常 UTF-8 编码
4. 是否误删了 `NODE_CLASS_MAPPINGS` 或 `NODE_DISPLAY_NAME_MAPPINGS`
5. 是否误删了 `WEB_DIRECTORY`

### 问题五：输出顺序不对

当前版本固定顺序必须是：

```text
composition -> hairstyle -> hair_color -> face -> expression -> pose -> body -> top_clothing -> bottom_clothing -> lighting -> background
```

如果你看到输出顺序不对，请检查：

1. 是否加载到了旧版本节点
2. 是否重启过 ComfyUI
3. `structured_prompt_node.py` 是否被其他版本覆盖

### 问题六：输出为空

如果 `merged_prompt` 为空，请检查：

1. 11 个输入框是否真的填了内容
2. 输入内容是否只有空格或换行
3. 是否所有字段都被清理后变成空字符串

## 15. 兼容性说明

当前版本尽量保持这些内容稳定：

- 节点分类仍然是 `YI/文本工具`
- 节点显示名仍然是 `结构化提示词编辑器`
- 节点类映射名仍然是 `StructuredPromptEditorNode`
- 输出仍然是 1 个 `STRING`
- 输出名仍然是 `merged_prompt`

这次升级重点只在前端：

1. 保留后端 11 字段和原有合并逻辑
2. 重写前端布局为两列结构
3. 把标签与 textarea 放入同一个 DOM 容器中
4. 让 `background` 单独占最后一行并横跨两列
