import { app } from "../../../scripts/app.js";

const TARGET_NODE_CLASS = "StructuredPromptEditorNode";

// 字段顺序与后端保持一致，布局信息也在这里统一定义。
const FIELD_LAYOUTS = [
    { name: "composition", row: 0, column: 0, colSpan: 1 },
    { name: "hairstyle", row: 0, column: 1, colSpan: 1 },
    { name: "hair_color", row: 1, column: 0, colSpan: 1 },
    { name: "face", row: 1, column: 1, colSpan: 1 },
    { name: "expression", row: 2, column: 0, colSpan: 1 },
    { name: "pose", row: 2, column: 1, colSpan: 1 },
    { name: "body", row: 3, column: 0, colSpan: 1 },
    { name: "top_clothing", row: 3, column: 1, colSpan: 1 },
    { name: "bottom_clothing", row: 4, column: 0, colSpan: 1 },
    { name: "lighting", row: 4, column: 1, colSpan: 1 },
    { name: "background", row: 5, column: 0, colSpan: 2 },
];

const UI = {
    paddingX: 14,
    paddingY: 12,
    columnGap: 12,
    rowGap: 10,
    labelHeight: 18,
    labelGap: 4,
    textareaHeight: 54,
    minColumnWidth: 240,
};

const MIN_NODE_WIDTH = UI.paddingX * 2 + UI.columnGap + UI.minColumnWidth * 2;

function isTargetNode(node) {
    return node?.comfyClass === TARGET_NODE_CLASS;
}

function hideSourceWidget(widget) {
    if (!widget || widget.__structuredPromptHidden) {
        return;
    }

    widget.__structuredPromptHidden = true;
    widget.__structuredPromptOriginalType = widget.type;
    widget.__structuredPromptOriginalComputeSize = widget.computeSize?.bind(widget);
    widget.__structuredPromptOriginalDraw = widget.draw?.bind(widget);

    widget.type = `structured_prompt_hidden_${widget.name}`;
    widget.computeSize = () => [0, -4];
    widget.draw = function () {
        if (widget.inputEl) {
            widget.inputEl.style.display = "none";
        }
    };

    if (widget.inputEl) {
        widget.inputEl.placeholder = "";
        widget.inputEl.style.display = "none";
        widget.inputEl.style.pointerEvents = "none";
    }
}

function createStyleTag() {
    if (document.getElementById("structured-prompt-editor-style")) {
        return;
    }

    const styleTag = document.createElement("style");
    styleTag.id = "structured-prompt-editor-style";
    styleTag.textContent = `
        .structured-prompt-editor-layout {
            position: relative;
            width: 100%;
            box-sizing: border-box;
            overflow: visible;
        }

        .structured-prompt-editor-field {
            position: absolute;
            box-sizing: border-box;
        }

        .structured-prompt-editor-label {
            position: absolute;
            left: 0;
            top: 0;
            box-sizing: border-box;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 12px;
            line-height: 18px;
            font-weight: 600;
            color: #d8d8d8;
        }

        .structured-prompt-editor-textarea {
            position: absolute;
            box-sizing: border-box;
            resize: none;
            margin: 0;
            padding: 6px 8px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 8px;
            background: rgba(24, 24, 24, 0.92);
            color: #f3f3f3;
            font-size: 12px;
            line-height: 1.4;
            outline: none;
        }

        .structured-prompt-editor-textarea:focus {
            border-color: rgba(255, 255, 255, 0.28);
        }
    `;

    document.head.appendChild(styleTag);
}

function createFieldView(sourceWidget, layout) {
    const fieldEl = document.createElement("div");
    fieldEl.className = "structured-prompt-editor-field";

    const labelEl = document.createElement("div");
    labelEl.className = "structured-prompt-editor-label";
    labelEl.textContent = sourceWidget.name;

    const textareaEl = document.createElement("textarea");
    textareaEl.className = "structured-prompt-editor-textarea";
    textareaEl.spellcheck = false;
    textareaEl.wrap = "soft";
    textareaEl.rows = 4;
    textareaEl.value = sourceWidget.value ?? "";

    // 自定义 textarea 输入时，直接把值同步回后端原始 widget。
    textareaEl.addEventListener("input", () => {
        const nextValue = textareaEl.value;
        sourceWidget.value = nextValue;
        sourceWidget.callback?.call(sourceWidget, nextValue);
        textareaEl.value = sourceWidget.value ?? "";
        app.graph?.setDirtyCanvas(true, false);
    });

    fieldEl.append(labelEl, textareaEl);

    return {
        name: sourceWidget.name,
        layout,
        sourceWidget,
        fieldEl,
        labelEl,
        textareaEl,
    };
}

function computeLayoutMetrics(nodeWidth) {
    const contentWidth = Math.max(nodeWidth - UI.paddingX * 2, UI.minColumnWidth * 2 + UI.columnGap);
    const columnWidth = Math.floor((contentWidth - UI.columnGap) / 2);
    const fieldHeight = UI.labelHeight + UI.labelGap + UI.textareaHeight;

    const items = FIELD_LAYOUTS.map((layout) => {
        const width = layout.colSpan === 2 ? contentWidth : columnWidth;
        const x = UI.paddingX + layout.column * (columnWidth + UI.columnGap);
        const y = UI.paddingY + layout.row * (fieldHeight + UI.rowGap);

        return {
            ...layout,
            x,
            y,
            width,
            height: fieldHeight,
        };
    });

    const lastRow = Math.max(...FIELD_LAYOUTS.map((item) => item.row));
    const totalHeight = UI.paddingY * 2 + (lastRow + 1) * fieldHeight + lastRow * UI.rowGap;

    return {
        columnWidth,
        contentWidth,
        fieldHeight,
        totalHeight,
        items,
    };
}

function syncFieldValue(fieldView) {
    const value = fieldView.sourceWidget?.value ?? "";
    if (fieldView.textareaEl.value !== value) {
        fieldView.textareaEl.value = value;
    }
}

function applyFieldLayout(fieldView, layoutBox) {
    const { fieldEl, labelEl, textareaEl } = fieldView;

    fieldView.layoutBox = {
        row: layoutBox.row,
        column: layoutBox.column,
        x: layoutBox.x,
        y: layoutBox.y,
        width: layoutBox.width,
        height: layoutBox.height,
    };

    Object.assign(fieldEl.style, {
        left: `${layoutBox.x}px`,
        top: `${layoutBox.y}px`,
        width: `${layoutBox.width}px`,
        height: `${layoutBox.height}px`,
    });

    Object.assign(labelEl.style, {
        width: `${layoutBox.width}px`,
        height: `${UI.labelHeight}px`,
    });

    Object.assign(textareaEl.style, {
        left: "0px",
        top: `${UI.labelHeight + UI.labelGap}px`,
        width: `${layoutBox.width}px`,
        height: `${UI.textareaHeight}px`,
    });
}

function refreshAllFieldValues(node) {
    const state = node.__structuredPromptLayoutState;
    if (!state) {
        return;
    }

    for (const fieldView of state.fieldViews) {
        syncFieldValue(fieldView);
    }
}

function updateLayout(node) {
    const state = node.__structuredPromptLayoutState;
    if (!state) {
        return;
    }

    const isCollapsed = Boolean(node.flags?.collapsed);
    state.layoutWidget.element.style.display = isCollapsed ? "none" : "block";

    if (isCollapsed) {
        return;
    }

    if (node.size[0] < MIN_NODE_WIDTH) {
        node.setSize([MIN_NODE_WIDTH, node.size[1]]);
    }

    const metrics = computeLayoutMetrics(node.size[0]);
    state.layoutHeight = metrics.totalHeight;

    Object.assign(state.layoutWidget.element.style, {
        width: `${node.size[0]}px`,
    });

    Object.assign(state.containerEl.style, {
        width: `${node.size[0]}px`,
        height: `${metrics.totalHeight}px`,
    });

    for (const fieldView of state.fieldViews) {
        const layoutBox = metrics.items.find((item) => item.name === fieldView.name);
        if (layoutBox) {
            applyFieldLayout(fieldView, layoutBox);
        }
    }

    const computedSize = node.computeSize?.();
    if (Array.isArray(computedSize) && node.size[1] < computedSize[1]) {
        node.setSize([Math.max(node.size[0], MIN_NODE_WIDTH), computedSize[1]]);
    }
}

function buildLayoutWidget(node) {
    const sourceWidgets = [];
    for (const layout of FIELD_LAYOUTS) {
        const sourceWidget = node.widgets?.find((widget) => widget.name === layout.name);
        if (!sourceWidget) {
            return null;
        }
        sourceWidgets.push(sourceWidget);
    }

    for (const widget of sourceWidgets) {
        hideSourceWidget(widget);
    }

    const containerEl = document.createElement("div");
    containerEl.className = "structured-prompt-editor-layout";

    const layoutWidget = node.addDOMWidget(
        "structured_prompt_layout",
        "structured_prompt_layout",
        containerEl,
        {
            serialize: false,
            hideOnZoom: false,
            getMinHeight: () => node.__structuredPromptLayoutState?.layoutHeight ?? 0,
            getMaxHeight: () => node.__structuredPromptLayoutState?.layoutHeight ?? 0,
            getValue: () => "",
            setValue: () => {},
        }
    );

    layoutWidget.computeSize = () => [Math.max(node.size?.[0] || 0, MIN_NODE_WIDTH), node.__structuredPromptLayoutState?.layoutHeight ?? 0];
    layoutWidget.draw = function () {
        updateLayout(node);
    };

    const fieldViews = FIELD_LAYOUTS.map((layout) => {
        const sourceWidget = sourceWidgets.find((widget) => widget.name === layout.name);
        const fieldView = createFieldView(sourceWidget, layout);
        containerEl.appendChild(fieldView.fieldEl);
        return fieldView;
    });

    return {
        containerEl,
        layoutWidget,
        fieldViews,
        layoutHeight: 0,
    };
}

function attachNodeHooks(node) {
    const originalOnConfigure = node.onConfigure?.bind(node);
    node.onConfigure = function () {
        const result = originalOnConfigure?.apply(this, arguments);
        refreshAllFieldValues(this);
        requestAnimationFrame(() => {
            refreshAllFieldValues(this);
            updateLayout(this);
            app.graph?.setDirtyCanvas(true, true);
        });
        return result;
    };

    const originalOnResize = node.onResize?.bind(node);
    node.onResize = function () {
        const result = originalOnResize?.apply(this, arguments);
        requestAnimationFrame(() => updateLayout(this));
        return result;
    };

    const originalOnRemoved = node.onRemoved?.bind(node);
    node.onRemoved = function () {
        const state = this.__structuredPromptLayoutState;
        state?.layoutWidget?.onRemove?.();
        delete this.__structuredPromptLayoutState;
        return originalOnRemoved?.apply(this, arguments);
    };
}

function setupNode(node) {
    if (!isTargetNode(node) || node.__structuredPromptLayoutInitialized) {
        return;
    }

    createStyleTag();

    const state = buildLayoutWidget(node);
    if (!state) {
        return;
    }

    node.__structuredPromptLayoutInitialized = true;
    node.__structuredPromptLayoutState = state;

    state.layoutWidget.onRemove = () => {
        state.containerEl.remove();
    };

    attachNodeHooks(node);
    refreshAllFieldValues(node);

    requestAnimationFrame(() => {
        updateLayout(node);
        refreshAllFieldValues(node);
        app.graph?.setDirtyCanvas(true, true);
    });
}

app.registerExtension({
    name: "ComfyUI.StructuredPromptEditor.FixedGridLayout",
    nodeCreated(node) {
        setupNode(node);
    },
});
