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

// 安全获取 TavernHelper 的兜底函数
function getTavernHelper() {
    if (typeof window.TavernHelper !== 'undefined') return window.TavernHelper;
    if (typeof TavernHelper !== 'undefined') return TavernHelper;
    return null;
}

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
            toastr.success("✨ GM断语已添加到输入框，详细细节已作为 D1 潜入后台！");
        } else {
            toastr.error("⚠️ 未能找到酒馆聊天输入框！");
        }
    } catch (err) {
        console.error("追加输入框报错:", err);
    }
}

window.sendRpgRequest = (actionType) => executeDivination('rpg', actionType);

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

let baziInjectUninjector = null; 
let isBaziEventInjected = false; 

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

    // 双重护盾：监听生成结束，自动拔除 D1 注入
    if (typeof SillyTavern !== 'undefined' && SillyTavern.eventSource) {
        SillyTavern.eventSource.on(SillyTavern.eventTypes.GENERATION_ENDED, async () => {
            if (baziInjectUninjector) {
                baziInjectUninjector(); 
                baziInjectUninjector = null;
                console.log("🔮 [玄学跑团] 阅后即焚触发：已通过 TavernHelper 拔除 D1 注入！");
            }
            if (isBaziEventInjected) {
                await SillyTavern.executeSlashCommandsWithOptions('/flushinject bazi_rpg_inject');
                isBaziEventInjected = false;
                console.log("🔮 [玄学跑团] 阅后即焚触发：已通过原生宏命令拔除 D1 注入！");
            }
        });
    }

    $("#bazi_open_modal_btn").on("click", () => $("#bazi_modal_container").css('display', 'flex').hide().fadeIn('fast'));
    $("#bazi_modal_close").on("click", () => $("#bazi_modal_container").fadeOut('fast'));
    $("#bazi_modal_container").on("click", function(e) { if (e.target === this) $(this).fadeOut('fast'); });

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
        $('.bazi-tab-btn[data-tab="tab-gua"]').click(); 
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
                if (typeof window.characters !== 'undefined' && typeof window.this_chid !== 'undefined') {
                    const trueCharData = window.characters[window.this_chid];
                    if (trueCharData) {
                        charName = trueCharData.name || "未知角色";
                        charDesc = trueCharData.description || "无详细描述";
                    }
                }
                if (context.chat && context.chat.length > 0) {
                    chatHistory = context.chat.slice(-5).map(m => `${m.name || 'Unknown'}: ${m.mes || ''}`).join('\n');
                }
            }
        } catch (ctxErr) {
            console.warn("🔮 抓取酒馆上下文警告，已启用保底预设:", ctxErr);
        }
        
        const extraInput = $('#bazi_rpg_extra_input').val().trim() || "无补充细节";

        systemPrompt = `【停止小说续写，仅推演八字六爻】\n你现在是一个服务于TRPG文本扮演的“赛博算命GM”。你需要结合角色的底层设定、近期聊天记录，以及用户抛出的六爻卦象对后续剧情进行推演。\n【核心准则】\n1. 必须输出合法、纯净的 JSON 格式！绝对不要在 JSON 里加任何 // 注释！\n2. 不要发散写小说。summary字段是你作为GM给出的简短断语。`;
        
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

        userPrompt = `【当前时间】${todayStr}\n【角色设定】${charName}\n${charDesc}\n【用户设定】${userDesc}\n【近期记录】\n${chatHistory}\n【用户补充意图】${extraInput}\n【六爻金钱课结果】\n${liuyaoData}\n【你的GM任务】${taskDesc}\n请严格输出纯净 JSON，不要任何其他废话：\n{\n  "summary": "（填入一句话判定或羁绊设定）",\n  "hexagram_interpretation": "（填入六爻卦象解读）",\n  "details": "（填入详细的情境推演细节）"\n}`;
    }

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

        let cleanedString = aiContentString.replace(/<think>[\s\S]*?<\/think>/gi, '').trim(); 
        cleanedString = cleanedString.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleanedString.indexOf('{');
        const lastBrace = cleanedString.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanedString = cleanedString.substring(firstBrace, lastBrace + 1);
        }

        let aiResult = {};
        try {
            aiResult = JSON.parse(cleanedString);
        } catch (parseErr) {
            console.error("❌ JSON 解析致命错误！原始文本：\n", aiContentString);
            throw new Error(`AI 返回格式不规范，解析失败！按 F12 查看控制台。`);
        }
        
        $('#bazi_summary-content').html(typeof marked !== 'undefined' ? marked.parse(aiResult.summary || "") : aiResult.summary);
        $('#bazi_hexagram-content').html(typeof marked !== 'undefined' ? marked.parse(aiResult.hexagram_interpretation || "") : aiResult.hexagram_interpretation);
        $('#bazi_details-content').html(typeof marked !== 'undefined' ? marked.parse(aiResult.details || "") : aiResult.details);

        const TH = getTavernHelper();

        if (mode === 'rpg' && aiResult.summary) {
            if (actionType !== 'bond') {
                appendToChatInput(aiResult.summary);
                if (aiResult.details) {
                    if (TH && TH.injectPrompts) {
                        const safeDetails = aiResult.details.replace(/\n/g, ' ');
                        const injectResult = TH.injectPrompts([{
                            id: "bazi_rpg_inject", position: 'in_chat', depth: 1, role: 'system',
                            content: `[System Note(玄学判定,阅后即焚): ${safeDetails}]`, should_scan: false
                        }], { once: false }); 
                        if (injectResult && typeof injectResult.uninject === 'function') baziInjectUninjector = injectResult.uninject;
                    } else if (typeof SillyTavern !== 'undefined') {
                        // 兜底方案：如果缺少 injectPrompts，用原生 Slash 宏命令注入 D1
                        const safeDetails = aiResult.details.replace(/\|/g, ' ').replace(/\n/g, ' ');
                        const injectCmd = `/inject id=bazi_rpg_inject position=chat depth=1 role=system [System Note(玄学判定,阅后即焚): ${safeDetails}]`;
                        await SillyTavern.executeSlashCommandsWithOptions(injectCmd);
                        isBaziEventInjected = true; 
                    }
                }
            } else {
                // ✨ 自动降级适配器：写入角色描述
                if (TH) {
                    try {
                        const bondMarker = "【八字玄学羁绊】：";
                        const newBondText = `${bondMarker}${aiResult.summary}`;

                        if (TH.updateCharacterWith) {
                            // 最佳路线：新版 TavernHelper 一键完成
                            await TH.updateCharacterWith('current', char => {
                                if (char.description.includes(bondMarker)) {
                                    char.description = char.description.replace(new RegExp("【八字玄学羁绊】：.*"), newBondText);
                                } else {
                                    char.description += `\n${newBondText}`;
                                }
                                return char;
                            });
                            toastr.success("💘 姻缘羁绊已成功写入并保存至角色卡描述 (Description) 中！");
                        } 
                        else if (TH.getCharacter && TH.replaceCharacter) {
                            // 备用路线：旧版 TavernHelper 组合拳
                            const char = await TH.getCharacter('current');
                            if (char.description.includes(bondMarker)) {
                                char.description = char.description.replace(new RegExp("【八字玄学羁绊】：.*"), newBondText);
                            } else {
                                char.description += `\n${newBondText}`;
                            }
                            await TH.replaceCharacter('current', char);
                            toastr.success("💘 姻缘羁绊已通过基础接口写入并保存至角色卡描述中！");
                        } 
                        else {
                            toastr.warning("⚠️ 找到酒馆助手，但缺少修改角色卡的所需 API。请打开 F12 查看详细情况。");
                            console.log("当前 TavernHelper 包含的接口:", Object.keys(TH));
                        }
                    } catch (charErr) {
                        console.error("写入角色卡失败:", charErr);
                        toastr.error("❌ 写入角色卡失败，请检查控制台。");
                    }
                } else {
                    toastr.error("❌ 仍未找到酒馆助手对象 (TavernHelper)！请打开 F12 查看控制台。");
                    console.log("当前 Window 对象包含的相关键:", Object.keys(window).filter(k => k.toLowerCase().includes('tavern')));
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
                                                                                     }                baziInjectUninjector(); 
                baziInjectUninjector = null;
                console.log("🔮 [玄学跑团] 阅后即焚触发：已通过 TavernHelper 拔除 D1 注入！");
            }
        });
    }

    $("#bazi_open_modal_btn").on("click", () => $("#bazi_modal_container").css('display', 'flex').hide().fadeIn('fast'));
    $("#bazi_modal_close").on("click", () => $("#bazi_modal_container").fadeOut('fast'));
    $("#bazi_modal_container").on("click", function(e) { if (e.target === this) $(this).fadeOut('fast'); });

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
        $('.bazi-tab-btn[data-tab="tab-gua"]').click(); 
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
                if (typeof window.characters !== 'undefined' && typeof window.this_chid !== 'undefined') {
                    const trueCharData = window.characters[window.this_chid];
                    if (trueCharData) {
                        charName = trueCharData.name || "未知角色";
                        charDesc = trueCharData.description || "无详细描述";
                    }
                }
                if (context.chat && context.chat.length > 0) {
                    chatHistory = context.chat.slice(-5).map(m => `${m.name || 'Unknown'}: ${m.mes || ''}`).join('\n');
                }
            }
        } catch (ctxErr) {
            console.warn("🔮 抓取酒馆上下文警告，已启用保底预设:", ctxErr);
        }
        
        const extraInput = $('#bazi_rpg_extra_input').val().trim() || "无补充细节";

        systemPrompt = `【停止小说续写，仅推演八字六爻】\n你现在是一个服务于TRPG文本扮演的“赛博算命GM”。你需要结合角色的底层设定、近期聊天记录，以及用户抛出的六爻卦象对后续剧情进行推演。\n【核心准则】\n1. 必须输出合法、纯净的 JSON 格式！绝对不要在 JSON 里加任何 // 注释！\n2. 不要发散写小说。summary字段是你作为GM给出的简短断语。`;
        
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

        userPrompt = `【当前时间】${todayStr}\n【角色设定】${charName}\n${charDesc}\n【用户设定】${userDesc}\n【近期记录】\n${chatHistory}\n【用户补充意图】${extraInput}\n【六爻金钱课结果】\n${liuyaoData}\n【你的GM任务】${taskDesc}\n请严格输出纯净 JSON，不要任何其他废话：\n{\n  "summary": "（填入一句话判定或羁绊设定）",\n  "hexagram_interpretation": "（填入六爻卦象解读）",\n  "details": "（填入详细的情境推演细节）"\n}`;
    }

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

        let cleanedString = aiContentString.replace(/<think>[\s\S]*?<\/think>/gi, '').trim(); 
        cleanedString = cleanedString.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleanedString.indexOf('{');
        const lastBrace = cleanedString.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanedString = cleanedString.substring(firstBrace, lastBrace + 1);
        }

        let aiResult = {};
        try {
            aiResult = JSON.parse(cleanedString);
        } catch (parseErr) {
            console.error("❌ JSON 解析致命错误！原始文本：\n", aiContentString);
            throw new Error(`AI 返回格式不规范，解析失败！按 F12 查看控制台。`);
        }
        
        $('#bazi_summary-content').html(typeof marked !== 'undefined' ? marked.parse(aiResult.summary || "") : aiResult.summary);
        $('#bazi_hexagram-content').html(typeof marked !== 'undefined' ? marked.parse(aiResult.hexagram_interpretation || "") : aiResult.hexagram_interpretation);
        $('#bazi_details-content').html(typeof marked !== 'undefined' ? marked.parse(aiResult.details || "") : aiResult.details);

        if (mode === 'rpg' && aiResult.summary) {
            if (actionType !== 'bond') {
                // 1. D1系统注入：使用酒馆助手纯净 API
                appendToChatInput(aiResult.summary);
                if (aiResult.details && typeof window.TavernHelper !== 'undefined') {
                    const safeDetails = aiResult.details.replace(/\n/g, ' ');
                    const injectResult = window.TavernHelper.injectPrompts([{
                        id: "bazi_rpg_inject",
                        position: 'in_chat',
                        depth: 1,
                        role: 'system',
                        content: `[System Note(玄学判定,阅后即焚): ${safeDetails}]`,
                        should_scan: false
                    }], { once: false }); 
                    
                    if (injectResult && typeof injectResult.uninject === 'function') {
                        baziInjectUninjector = injectResult.uninject;
                    }
                }
            } else {
                // 2. 羁绊写入：利用 TavernHelper 最正统的 API 修改角色卡 Description
                if (typeof window.TavernHelper !== 'undefined' && window.TavernHelper.updateCharacterWith) {
                    try {
                        await window.TavernHelper.updateCharacterWith('current', char => {
                            const bondMarker = "【八字玄学羁绊】：";
                            const newBondText = `${bondMarker}${aiResult.summary}`;
                            
                            // 检查描述中是否已经有羁绊记录
                            if (char.description.includes(bondMarker)) {
                                // 替换掉旧的羁绊文本（利用正则匹配该行）
                                const regex = new RegExp("【八字玄学羁绊】：.*");
                                char.description = char.description.replace(regex, newBondText);
                                toastr.success("💘 姻缘羁绊已更新并自动保存至角色卡描述 (Description) 中！");
                            } else {
                                // 首次追加
                                char.description += `\n${newBondText}`;
                                toastr.success("💘 姻缘羁绊已追加并自动保存至角色卡描述 (Description) 中！");
                            }
                            // 返回修改后的对象，TavernHelper 会自动帮你执行底层保存和 UI 更新！
                            return char;
                        });
                    } catch (charErr) {
                        console.error("写入角色卡失败:", charErr);
                        toastr.error("❌ 写入角色卡失败，请检查控制台。");
                    }
                } else {
                    toastr.error("❌ 未找到酒馆助手 (TavernHelper)！请确保扩展已启用。");
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
