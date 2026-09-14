/* Un Precompose 1.0.0-beta.1 | ExtendScript / ScriptUI | AE 24.0+
 * Copyright (c) 2026 wa13sans. See LICENSE: free use, no software resale.
 * One level at a time. Original project compositions are never edited.
 * 2D, 100% outer stretch. See the included Korean guide for limitations.
 */
#target aftereffects
(function (host) {
    var TITLE = "Un Precompose 1.0.0 Beta";
    function visit(group, fn) {
        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i);
            if (p.propertyType === PropertyType.PROPERTY) fn(p);
            else visit(p, fn);
        }
    }
    function animated(p) { return p.numKeys > 0 || p.expressionEnabled; }
    function hasExpressions(layer) {
        var result = false;
        visit(layer, function (p) { if (p.canSetExpression && p.expressionEnabled) result = true; });
        return result;
    }
    function enabledStyles(layer) {
        var g = layer.property("ADBE Layer Styles");
        if (!g) return false;
        for (var i = 1; i <= g.numProperties; i++) {
            var p = g.property(i);
            if (p.propertyType !== PropertyType.PROPERTY && p.enabled) return true;
        }
        return false;
    }
    function reason(layer, comp) {
        var src = layer.source, p, i, l;
        if (layer.locked) return "잠긴 레이어입니다. 잠금을 해제해주세요.";
        if (!src.numLayers) return "내부 레이어가 없는 컴포지션입니다.";
        if (layer.threeDLayer || layer.collapseTransformation) return "3D / Collapse Transformations는 지원하지 않습니다.";
        if (layer.timeRemapEnabled || Math.abs(layer.stretch - 100) > 0.00001) return "외부 Time Remapping / 100% 이외의 Time Stretch는 지원하지 않습니다.";
        if (src.pixelAspect !== comp.pixelAspect) return "내부와 외부의 Pixel Aspect Ratio가 다릅니다.";
        if (layer.hasTrackMatte || layer.isTrackMatte) return "외부 프리컴프의 Track Matte 연결을 먼저 해제해주세요.";
        if (layer.adjustmentLayer || layer.blendingMode !== BlendingMode.NORMAL || layer.preserveTransparency) return "외부 Adjustment / Blending Mode / Preserve Transparency는 지원하지 않습니다.";
        if (layer.property("ADBE Mask Parade").numProperties || layer.property("ADBE Effect Parade").numProperties || enabledStyles(layer)) return "외부 프리컴프에 Mask / Effect / Layer Style이 있습니다.";
        p = layer.property("ADBE Transform Group").property("ADBE Opacity");
        if (animated(p) || Math.abs(p.value - 100) > 0.00001) return "외부 Opacity는 키프레임 없이 100%여야 합니다.";
        p = layer.property("ADBE Audio Group");
        if (p) {
            p = p.property("ADBE Audio Levels");
            if (p && (animated(p) || p.value[0] !== 0 || p.value[1] !== 0)) return "외부 Audio Levels는 기본값 0 dB여야 합니다.";
        }
        p = layer.essentialProperty;
        if (p && p.numProperties) return "Essential Properties가 있는 프리컴프는 지원하지 않습니다.";
        if (hasExpressions(layer)) return "외부 프리컴프의 Expression은 먼저 키프레임으로 변환해주세요.";
        if (layer.autoOrient !== AutoOrientType.NO_AUTO_ORIENT) return "외부 Auto-Orient를 먼저 해제해주세요.";
        for (i = 1; i <= src.numLayers; i++) {
            l = src.layer(i);
            if (l instanceof CameraLayer || l instanceof LightLayer || l.threeDLayer) return "내부 3D / Camera / Light 레이어는 지원하지 않습니다.";
        }
        return "";
    }
    // Copy keyframe values and interpolation; never sample animations per frame.
    function copyProperty(s, d) {
        var k;
        if (s.isSeparationLeader && s.dimensionsSeparated) {
            d.dimensionsSeparated = true;
            for (k = 0; k < 2; k++) copyProperty(s.getSeparationFollower(k), d.getSeparationFollower(k));
            return;
        }
        if (!s.numKeys) { d.setValue(s.value); return; }
        for (k = 1; k <= s.numKeys; k++) d.setValueAtTime(s.keyTime(k), s.keyValue(k));
        for (k = 1; k <= s.numKeys; k++) {
            d.setTemporalEaseAtKey(k, s.keyInTemporalEase(k), s.keyOutTemporalEase(k));
            d.setInterpolationTypeAtKey(k, s.keyInInterpolationType(k), s.keyOutInterpolationType(k));
            if (s.keyInInterpolationType(k) === KeyframeInterpolationType.BEZIER && s.keyOutInterpolationType(k) === KeyframeInterpolationType.BEZIER) {
                d.setTemporalContinuousAtKey(k, s.keyTemporalContinuous(k));
                d.setTemporalAutoBezierAtKey(k, s.keyTemporalAutoBezier(k));
            }
            if (s.isSpatial) {
                d.setSpatialTangentsAtKey(k, s.keyInSpatialTangent(k), s.keyOutSpatialTangent(k));
                d.setSpatialContinuousAtKey(k, s.keySpatialContinuous(k));
                d.setSpatialAutoBezierAtKey(k, s.keySpatialAutoBezier(k));
            }
        }
        if (s.isSpatial) for (k = 2; k < s.numKeys; k++) d.setRovingAtKey(k, s.keyRoving(k));
    }
    function remapReferences(s, d, copies) {
        for (var i = 1; i <= s.numProperties; i++) {
            var sp = s.property(i), dp = d.property(i), k, v;
            if (!dp) continue;
            if (sp.propertyType !== PropertyType.PROPERTY) remapReferences(sp, dp, copies);
            else if (sp.propertyValueType === PropertyValueType.LAYER_INDEX) {
                if (sp.numKeys) {
                    for (k = 1; k <= sp.numKeys; k++) {
                        v = sp.keyValue(k); dp.setValueAtKey(k, v > 0 && copies[v] ? copies[v].index : 0);
                    }
                } else {
                    v = sp.value; dp.setValue(v > 0 && copies[v] ? copies[v].index : 0);
                }
            }
        }
    }
    function extract(pre, comp) {
        var src = pre.source, copies = [], created = [], children = [], ctrl = null;
        var i, l, c, ip, op, hasSolo = false, done = false;
        for (i = 1; i <= comp.numLayers; i++) {
            l = comp.layer(i);
            if (l.parent === pre) children.push({layer:l, locked:l.locked});
        }
        for (i = 1; i <= src.numLayers; i++) if (src.layer(i).solo) hasSolo = true;
        try {
            ctrl = comp.layers.addNull(comp.duration); created.push(ctrl);
            ctrl.name = pre.name + " [UnPrecompose CTRL]";
            ctrl.label = pre.label;
            ctrl.moveBefore(pre);
            ctrl.startTime = 0;
            ctrl.inPoint = pre.inPoint; ctrl.outPoint = pre.outPoint;
            if (pre.parent) ctrl.setParentWithJump(pre.parent);
            var names = ["ADBE Anchor Point", "ADBE Position", "ADBE Scale", "ADBE Rotate Z"];
            for (i = 0; i < names.length; i++) copyProperty(pre.property("ADBE Transform Group").property(names[i]), ctrl.property("ADBE Transform Group").property(names[i]));
            ctrl.enabled = false;
            ctrl.comment = "프리컴프의 2D Transform 보존용 Null입니다. 삭제하면 내부 레이어의 배치/애니메이션이 달라질 수 있습니다.";
            // copyToComp prepends a layer; explicitly restore the stack afterwards.
            for (i = 1; i <= src.numLayers; i++) {
                src.layer(i).copyToComp(comp);
                c = comp.layer(1); copies[i] = c; created.push(c); c.locked = false;
            }
            for (i = 1; i <= src.numLayers; i++) copies[i].moveBefore(pre);
            for (i = 1; i <= src.numLayers; i++) {
                l = src.layer(i); c = copies[i];
                c.setParentWithJump(l.parent ? copies[l.parent.index] : ctrl);
                c.startTime = l.startTime + pre.startTime;
                ip = Math.max(l.inPoint + pre.startTime, pre.inPoint);
                op = Math.min(l.outPoint + pre.startTime, pre.outPoint);
                if (op > ip) { c.inPoint = ip; c.outPoint = op; }
                // Keep nonoverlapping layers for parent/matte/expression references.
                c.enabled = l.enabled && pre.enabled && (!hasSolo || l.solo) && op > ip;
                if (c.hasAudio) c.audioEnabled = l.audioEnabled && pre.audioEnabled && (!hasSolo || l.solo) && op > ip;
                c.solo = pre.solo;
                c.guideLayer = l.guideLayer || pre.guideLayer;
                if (pre.motionBlur) c.motionBlur = true;
                if (c.hasTrackMatte) c.removeTrackMatte();
            }
            for (i = 1; i <= src.numLayers; i++) {
                l = src.layer(i); c = copies[i];
                if (l.hasTrackMatte) c.setTrackMatte(copies[l.trackMatteLayer.index], l.trackMatteType);
                remapReferences(l, c, copies);
            }
            for (i = 0; i < children.length; i++) {
                children[i].layer.locked = false;
                children[i].layer.setParentWithJump(ctrl);
                children[i].layer.locked = children[i].locked;
            }
            for (i = 1; i <= src.numLayers; i++) {
                copies[i].selected = true; copies[i].locked = src.layer(i).locked;
            }
            ctrl.selected = false;
            // Commit only after every copied layer and reference has been rebuilt.
            pre.remove(); done = true;
            return src.numLayers;
        } finally {
            if (!done) {
                for (i = 0; i < children.length; i++) {
                    try { children[i].layer.locked = false; children[i].layer.setParentWithJump(pre); children[i].layer.locked = children[i].locked; } catch (ignoreChild) {}
                }
                for (i = created.length - 1; i >= 0; i--) {
                    try { created[i].locked = false; created[i].remove(); } catch (ignoreCleanup) {}
                }
            }
        }
    }
    function run(status) {
        if (parseFloat(app.version) < 24) { alert("After Effects 2024 (24.0) 이상에서 사용해주세요."); return; }
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) { alert("작업할 컴포지션의 Timeline을 먼저 활성화해주세요."); return; }
        var selected = comp.selectedLayers, targets = [], blocked = [], i, j, r;
        var expressionWarning = false, renderWarning = false;
        for (i = 0; i < selected.length; i++) {
            if (!(selected[i] instanceof AVLayer) || !(selected[i].source instanceof CompItem)) continue;
            r = reason(selected[i], comp);
            if (r) blocked.push(selected[i].name + ": " + r);
            else targets.push(selected[i]);
        }
        if (!targets.length) { alert(blocked.length ? blocked.join("\n\n") : "Timeline에서 해제할 프리컴프 레이어를 선택해주세요."); return; }
        for (i = 0; i < targets.length; i++) {
            var s = targets[i].source;
            if (Math.abs(s.frameRate - comp.frameRate) > 0.0001 || s.preserveNestedFrameRate) renderWarning = true;
            for (j = 1; j <= s.numLayers; j++) {
                var l = s.layer(j);
                if (hasExpressions(l)) expressionWarning = true;
                if (l.adjustmentLayer || l.blendingMode !== BlendingMode.NORMAL || l.preserveTransparency) renderWarning = true;
            }
        }
        if (expressionWarning || renderWarning) {
            var msg = "다음 항목은 해제 후 결과가 달라질 수 있습니다.\n\n";
            if (expressionWarning) msg += "• 내부 Expression: thisComp, time, index, 레이어 이름 참조 등은 자동 변환하지 않습니다.\n";
            if (renderWarning) msg += "• Adjustment / Blending Mode / FPS: 원래 컴포지션 경계의 합성 결과는 보장하지 않습니다.\n";
            if (!confirm(msg + "\n계속 해제할까요?")) return;
        }
        // Use stable layer objects while processing from bottom to top.
        targets.sort(function (a, b) { return b.index - a.index; });
        var count = 0, layers = 0, error = "";
        app.beginUndoGroup(TITLE);
        try {
            for (i = 0; i < selected.length; i++) selected[i].selected = false;
            for (i = 0; i < targets.length; i++) { layers += extract(targets[i], comp); count++; }
        } catch (e) {
            error = "오류: " + e.toString() + "\n해당 프리컴프는 유지합니다. 필요하면 Edit > Undo로 이번 실행을 되돌려주세요.";
        } finally { app.endUndoGroup(); }
        status.text = count + "개 프리컴프 → " + layers + "개 레이어";
        if (blocked.length || error) alert((error ? error + "\n\n" : "") + (blocked.length ? "건너뛴 레이어:\n" + blocked.join("\n\n") : ""));
    }
    var ui = host instanceof Panel ? host : new Window("palette", TITLE, undefined, {resizeable:true});
    ui.orientation = "column"; ui.alignChildren = ["fill", "top"]; ui.margins = 14;
    ui.add("statictext", undefined, "프리컴프 선택 → 버튼 클릭");
    var button = ui.add("button", undefined, "Un Precompose"); button.preferredSize = [260, 42];
    var status = ui.add("statictext", undefined, "내부 레이어를 한 단계 펼칩니다.");
    var help = ui.add("button", undefined, "사용 안내");
    button.onClick = function () {
        button.enabled = false;
        try { run(status); } catch (e) { alert(e.toString()); }
        finally { button.enabled = true; }
    };
    help.onClick = function () {
        alert("1. Timeline에서 프리컴프 레이어를 선택합니다.\n2. Un Precompose를 누릅니다.\n3. 내부 레이어와 Transform 제어용 Null이 나옵니다.\n\nProject의 원본 컴포지션은 보관됩니다.\n실행 취소: Ctrl+Z (Mac: Cmd+Z)\n\n2D / 외부 Time Stretch 100% 기준입니다.\n프리컴프의 화면 밖 잘림, 렌더링 경계, Expression 문맥은 재현하지 않습니다.\n세부 제한은 함께 제공한 사용설명서를 참고해주세요.", TITLE);
    };
    ui.onResizing = ui.onResize = function () { this.layout.resize(); };
    ui.layout.layout(true);
    if (ui instanceof Window) { ui.center(); ui.show(); }
})(this);
