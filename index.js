const extensionName = "bazi-gacha-array-test";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

if (typeof marked === 'undefined') {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    document.head.appendChild(script);
}

// ================== 前端 64卦 硬核映射表 ==================
const hexagramMap = {
    "111111":"乾为天", "000000":"坤为地", "100010":"水雷屯", "010001":"山水蒙", "111010":"水天需", "010111":"天水讼", "010000":"地水师", "000010":"水地比", "111011":"风天小畜", "110111":"天泽履", "111000":"地天泰", "000111":"天地否", "101111":"天火同人", "111101":"火天大有", "001000":"地山谦", "000100":"雷地豫", "100110":"泽雷随", "011001":"山风蛊", "110000":"地泽临", "000011":"风地观", "100101":"火雷噬嗑", "101001":"山火贲", "000001":"山地剥", "100000":"地雷复", "100111":"天雷无妄", "111001":"山天大畜", "100001":"山雷颐", "011110":"泽风大过", "010010":"坎为水", "101101":"离为火", "001110":"泽山咸", "011100":"雷风恒", "001111":"天山遁", "111100":"雷天大壮", "000101":"火地晋", "101000":"地火明夷", "101011":"风火家人", "110101":"火泽睽", "001010":"水山蹇", "010100":"雷水解", "110001":"山泽损", "100011":"风雷益", "111110":"泽天夬", "011111":"天风姤", "000110":"泽地萃", "011000":"地风升", "010110":"泽水困", "011010":"水风井", "101110":"泽火革", "011101":"火风鼎", "100100":"震为雷", "001001":"艮为山", "001011":"风山渐", "110100":"雷泽归妹", "101100":"雷火丰", "001101":"火山旅", "011011":"巽为风", "110110":"兑为泽", "010011":"风水涣", "110010":"水泽节", "110011":"风泽中孚", "001100":"雷山小过", "101010":"水火既济", "010101":"火水未济"
};

// ================== 追加到酒馆聊天框的核心逻辑 ==================
function appendToChatInput(text) {
    try {
        const $chatInput = $('#send_textarea');
        if ($chatInput.length) {
            const currentVal = $chatInput.val();
            const addition = `（${text}）`; 
            $chatInput.val(currentVal ? currentVal + '\n' + addition : addition);
            
            $chatInput[0].dispatchEvent(new Event('input', { bubbles: true }));
            $chatInput.trigger('input');
            $chatInput.focus();
            
            toastr.success("✨ GM断语已添加到输入框，可继续编辑！");
        } else {
            toastr.error("⚠️ 未能找到酒馆聊天输入框！");
        }
    } catch (err) {
        console.error("追加输入框报错:", err);
    }
}

window.sendRpgRequest = (actionType) => executeDivination('rpg', actionType);

// ================== 六爻起卦 ==================
function castLiuyao() {
    const wish = $('#bazi_wish_real').val().trim() || $('#bazi_rpg_extra_input').val().trim() || "未命名事项";

    $('#bazi_hexagram-lines-box').empty();
    $('#bazi_hexagram-display').show();

    const yaoNames = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
    let resultsTextForAI = "";
    let visualHtml = ""; 
    let originalBits = ""; 
    let changedBits = "";  

    for (let i = 0; i < 6; i++) {
        const toss = () => (Math.random() < 0.5 ? 2 : 3); 
        const sum = toss() + toss() + toss();
        let symbol = ""; let mark = ""; let typeName = "";
        if (sum === 6) { symbol = "▅▅　▅▅"; mark = "× 交"; typeName = "老阴"; originalBits += "0"; changedBits += "1"; }
        else if (sum === 7) { symbol = "▅▅▅▅▅"; mark = "′ 单"; typeName = "少阳"; originalBits += "1"; changedBits += "1"; }
        else if (sum === 8) { symbol = "▅▅　▅▅"; mark = "″ 拆"; typeName = "少阴"; originalBits += "0"; changedBits += "0"; }
        else if (sum === 9) { symbol = "▅▅▅▅▅"; mark = "○ 重"; typeName = "老阳"; originalBits += "1"; changedBits += "0"; }

        resultsTextForAI += `${yaoNames[i]}: ${typeName} -> 符号[${symbol}]\n`;
        visualHtml = `<div class="hexagram-line"><span class="yao-name">${yaoNames[i]}</span><span class="yao-symbol">${symbol}</span><span class="yao-mark">${mark}</span><span class="yao-type">${typeName}</span></div>` + visualHtml; 
    }

    const benGua = hexagramMap[originalBits] || "未知卦象";
    const bianGua = hexagramMap[changedBits] || "未知卦象";

    $('#bazi_hexagram-title').text(`本卦：${benGua}  |  变卦：${bianGua}`);
    $('#bazi_hexagram-lines-box').html(visualHtml);
    $('#bazi_liuyaoResultData').val(`【前端推算结果】本卦：${benGua}，变卦：${bianGua}\n【抛掷明细】\n${resultsTextForAI}`);
    $('#bazi_castBtn').text("☯️ 卦象已成 (点击可重新起卦)").css("background-color", "#8b0000");
}

// ================== 初始化与 Tab 切换 ==================
jQuery(async () => {
    try {
        const uiHtml = await $.get(`${extensionFolderPath}/bazi_ui.html`);
        $("#extensions_settings").append(uiHtml);

        const modalHtml = await $.get(`${extensionFolderPath}/bazi_modal.html`);
        $("body").append(modalHtml);
    } catch (e) {
        console.error("❌ 界面加载失败:", e);
        return;
    }

    $("#bazi_open_modal_btn").on("click", () => $("#bazi_modal_container").css('display', 'flex').hide().fadeIn('fast'));
    $("#bazi_modal_close").on("click", () => $("#bazi_modal_container").fadeOut('fast'));
    $("#bazi_modal_container").on("click", function(e) { if (e.target === this) $(this).fadeOut('fast'); });

    // 纯净版 Tab 切换：不再隐藏任何按钮！
    $('.bazi-tab-btn').on('click', function() {
        $('.bazi-tab-btn').removeClass('active');
        $(this).addClass('active');
        const target = $(this).data('tab');
        $('.bazi-tab-content').removeClass('active');
        $(`#${target}`).addClass('active');
    });

    const savedUseStApi = localStorage.getItem('bazi_use_st_api');
    if (savedUseStApi !== null) $('#bazi_use_st_api').prop('checked', savedUseStApi === 'true');
    $('#bazi_use_st_api').on('change', () => $('#bazi_use_st_api').is(':checked') ? $('#bazi_custom_api_block').slideUp() : $('#bazi_custom_api_block').slideDown());
    if(!$('#bazi_use_st_api').is(':checked')) $('#bazi_custom_api_block').show();

    $('#bazi_apiUrl').val(localStorage.getItem('bazi_api_url') || '');
    $('#bazi_apiKey').val(localStorage.getItem('bazi_api_key') || '');
    
    $('#bazi_castBtn').on('click', castLiuyao);
    $('#bazi_sendBtn_Real').on('click', () => executeDivination('real'));
});

// ================== 核心调度器 ==================
async function executeDivination(mode, actionType = null) {
    const useStApi = $('#bazi_use_st_api').is(':checked');
    const apiUrl = $('#bazi_apiUrl').val().trim();
    const apiKey = $('#bazi_apiKey').val().trim();
    const liuyaoData = $('#bazi_liuyaoResultData').val();

    if(!useStApi && (!apiUrl || !apiKey)) return toastr.warning("请填写自定义 API，或勾选使用酒馆主 API！");
    if(!liuyaoData) {
        $('.bazi-tab-btn[data-tab="tab-gua"]').click(); // 自动跳到起卦页
        return toastr.warning("【警告】请先点击按钮抛掷三枚铜钱起卦！");
    }

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}年${todayDate.getMonth() + 1}月${todayDate.getDate()}日`;

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === 'real') {
        const wish = $('#bazi_wish_real').val().trim();
        if(!wish) return toastr.warning("请在三次元标签页填写现实心愿！");
        
        systemPrompt = `你现在是一个精通《周易》卦爻辞及八字命理的专业人员。\n【日期推演】当前日期：${todayStr}。请确立起始日期，若凶则在7日内另择吉日...`;
        userPrompt = `阳历生日：${$('#bazi_birthday').val()}\n心愿：【${wish}】\n六爻结果：\n${liuyaoData}\n请提供 JSON 格式的指导，包含 summary, hexagram_interpretation, details。`;
        
    } 
    else if (mode === 'rpg') {
        let charName = "未知角色", charDesc = "未知角色设定", userDesc = "普通人类", chatHistory = "暂无近期对话。";
        
        try {
            const context = (typeof window.SillyTavern !== 'undefined' && window.SillyTavern.getContext) ? window.SillyTavern.getContext() : null;
            if (context) {
                userDesc = context.user_persona || "普通人类";
                const charData = (context.characters && context.characterId) ? context.characters[context.characterId] : null;
                if (charData) {
                    charName = charData.name || "未知角色";
                    charDesc = charData.description || "无详细描述";
                }
                if (context.chat && context.chat.length > 0) {
                    chatHistory = context.chat.slice(-5).map(m => `${m.name || 'Unknown'}: ${m.mes || ''}`).join('\n');
                }
            }
        } catch (ctxErr) {
            console.warn("🔮 抓取酒馆上下文警告，已启用保底预设:", ctxErr);
        }
        
        const extraInput = $('#bazi_rpg_extra_input').val().trim() || "无补充细节";

        // 🟢 【精准植入 1：防写小说护盾与任务定制】
        systemPrompt = `【停止小说续写，仅推演八字六爻】\n你现在是一个服务于TRPG文本扮演的“赛博算命GM”。你需要结合角色的底层设定、近期聊天记录，以及用户抛出的六爻卦象对后续剧情进行推演。\n【核心准则】\n1. 严格按要求输出 JSON 格式，绝不要发散写小说。\n2. summary字段是你作为GM给出的简短断语。`;
        
        let taskDesc = "";
        if(actionType === 'bond') {
            taskDesc = "测算用户与角色的八字姻缘及当前羁绊状态。请在summary中给出一句极其精炼、适合作为被动设定的【羁绊断语】（例如：命理互补，金水相生，对用户有天然的信任感）。";
        } else if(actionType === 'check') {
            taskDesc = `对用户的行动意图【${extraInput}】进行剧情检定（大成功/成功/失败/大失败），给出判定结果与玄学原因。`;
        } else if(actionType === 'event') {
            taskDesc = "生成一个强烈的随机突发事件（如意外、第三者介入、环境异变），用于打破当前僵局。";
        } else if(actionType === 'radar') {
            taskDesc = "为用户寻找目标提供方位、五行元素相关的模糊但绝对有用的玄学雷达线索。";
        }

        userPrompt = `【当前时间】${todayStr}\n【角色设定】${charName}\n${charDesc}\n【用户设定】${userDesc}\n【近期记录】\n${chatHistory}\n【用户补充意图】${extraInput}\n【六爻金钱课结果】\n${liuyaoData}\n【你的GM任务】${taskDesc}\n请严格输出 JSON：\n{\n  "summary": "一句话概括动作意图或羁绊设定（如果是动作判定，我将放入玩家输入框）",\n  "hexagram_interpretation": "简短六爻卦象解读",\n  "details": "详细的情境推演细节"\n}`;
    }

    // 无论从 Tab 2 还是 Tab 3 发起测算，都统一跳转到 Tab 4 看结果
    $('.bazi-tab-btn[data-tab="tab-gua"]').click();
    $('#bazi_sendBtn_Real').prop('disabled', true);
    $('#bazi_summary-content, #bazi_hexagram-content, #bazi_details-content').html("灵力流转中...");

    try {
        let aiContentString = "";

        if (useStApi) {
            const context = typeof window.SillyTavern !== 'undefined' ? window.SillyTavern.getContext() : window;
            if (context && context.generateRaw) {
                aiContentString = await context.generateRaw({ systemPrompt: systemPrompt, prompt: userPrompt });
            } else {
                throw new Error("酒馆 API 生成函数未找到，请在配置中填写自定义 API！");
            }
        } else {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: $('#bazi_modelInput').val(), messages: [ {role: "system", content: systemPrompt}, {role: "user", content: userPrompt} ], response_format: { type: "json_object" } })
            });
            if(!response.ok) throw new Error(await response.text());
            const data = await response.json();
            aiContentString = data.choices[0].message.content;
        }

        aiContentString = aiContentString.replace(/```json/gi, '').replace(/```/g, '').trim();
        const aiResult = JSON.parse(aiContentString);
        
        $('#bazi_summary-content').html(typeof marked !== 'undefined' ? marked.parse(aiResult.summary || "") : aiResult.summary);
        $('#bazi_hexagram-content').html(typeof marked !== 'undefined' ? marked.parse(aiResult.hexagram_interpretation || "") : aiResult.hexagram_interpretation);
        $('#bazi_details-content').html(typeof marked !== 'undefined' ? marked.parse(aiResult.details || "") : aiResult.details);

        // 🟢 【精准植入 2：羁绊写入角色卡，且阻止发往输入框】
        if (mode === 'rpg' && aiResult.summary) {
            if (actionType !== 'bond') {
                // 非羁绊动作，扔进输入框
                appendToChatInput(aiResult.summary);
            } else {
                // 羁绊测算，拦截输入框，静默写入角色卡
                try {
                    if (window.TavernHelper && window.TavernHelper.updateCharacterWith) {
                        await window.TavernHelper.updateCharacterWith('current', char => {
                            const appendText = `\n【八字玄学羁绊】：${aiResult.summary}`;
                            if (!char.description.includes("八字玄学羁绊")) {
                                char.description += appendText;
                                toastr.success("💘 姻缘羁绊已永久写入当前角色设定 (Description) 中！");
                            } else {
                                toastr.info("💘 角色卡中已有羁绊设定，本次未重复写入。");
                            }
                            return char;
                        });
                    // ...前面的代码...
} else {
    // 兜底方案：如果没装 TavernHelper，直接改本地内存并【强制触发硬盘保存】
    const context = (typeof window.SillyTavern !== 'undefined' && window.SillyTavern.getContext) ? window.SillyTavern.getContext() : null;
    if (context && context.characters && context.characterId) {
        const charData = context.characters[context.characterId];
        
        if (!charData.description.includes("八字玄学羁绊")) {
            // 1. 修改内存
            charData.description += `\n【八字玄学羁绊】：${aiResult.summary}`;
            
            // 2. 尝试同步更新到可能开着的 UI 文本框上 (防止玩家刚好停在编辑页，看到旧数据)
            const $descBox = $('#character_popup_description');
            if ($descBox.length) {
                $descBox.val(charData.description);
            }

            // 3. ✨ 核心大招：强行呼叫酒馆底层的保存函数，直接写入硬盘文件！
            if (typeof window.saveCharacterDebounced === 'function') {
                window.saveCharacterDebounced();
                toastr.success("💘 羁绊已通过原生接口永久写入角色卡，并已保存到本地！");
            } else {
                toastr.success("💘 羁绊已写入内存 (未能自动保存，请手动触发)！");
            }
            
        } else {
            toastr.info("💘 角色卡中已有羁绊设定。");
        }
    }
}

                } catch (charErr) {
                    console.error("写入角色卡失败:", charErr);
                }
            }
        }

    } catch (error) {
        console.error("❌ 测算报错:", error);
        $('#bazi_summary-content').html("⚠️ 测算失败。");
        $('#bazi_details-content').html(error.message);
    } finally {
        $('#bazi_sendBtn_Real').prop('disabled', false);
    }
}
