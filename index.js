(function () {
    // 【警告】如果你在本地测试时修改了文件夹名称（例如改成了 bazi-gacha-test），
    // 请务必将这里的 extensionName 改成一致的名字，否则 HTML 界面会加载失败！
    const extensionName = "bazi-gacha-array";
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

    // ================== 本地游戏知识库 ==================
    const GameDatabase = [
        { name: "恋与深空", keywords: ["恋与深空", "深空"], desc: "一款近未来幻想的3D乙女恋爱手游...五星卡分为日卡和月卡，日卡为两张一套，必须抽齐一套才有用，满150抽会送一张用户可自选两张中任意一张；月卡就是单张。", characters: [] },
        { name: "世界之外", keywords: ["世界之外", "世外"], desc: "网易开发的无限流言情手游。女性玩家扮演不同角色于副本中完成任务，体验超越现实的甜蜜爱恋。", characters: [] },
        { name: "无限暖暖", keywords: ["无限暖暖", "暖暖"], desc: "暖暖系列第五代作品。注：本游戏不抽卡，抽四星阁/五星阁。为服装部件，四星阁5抽保底一件，五星阁20抽保底一件，整套多为8-11件，满进化需抽2套。本游戏不会歪常驻服装。", characters: [] }
    ];

    function extractGameContext(wishText) {
        let injectedContext = "";
        GameDatabase.forEach(game => {
            if (game.keywords.some(kw => wishText.includes(kw))) {
                injectedContext += `\n【系统注入资料：${game.name}】\n简介：${game.desc}\n`;
            }
        });
        return injectedContext;
    }

    // ================== 追加到酒馆聊天框的核心逻辑 ==================
    function appendToChatInput(text) {
        const $chatInput = $('#send_textarea');
        if ($chatInput.length) {
            const currentVal = $chatInput.val();
            const addition = `（${text}）`; 
            $chatInput.val(currentVal ? currentVal + '\n' + addition : addition);
            
            $chatInput[0].dispatchEvent(new Event('input', { bubbles: true }));
            $chatInput.trigger('input');
            $chatInput.focus();
            
            toastr.success("✨ 摘要已添加到输入框，详细天机已暗中注入 D1 (阅后即焚)！");
        } else {
            toastr.error("⚠️ 未能找到酒馆聊天输入框！");
        }
    }

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
            console.error("❌ 无法加载插件 HTML 界面。请检查扩展文件夹名称是否与 extensionName 变量一致！", e);
            return;
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
            
            if(target === 'tab-gua') {
                const isFromReal = $('.bazi-tab-btn[data-tab="tab-real"]').hasClass('last-visited');
                $('#bazi_sendBtn_Real').toggle(isFromReal);
            } else {
                $('.bazi-tab-btn').removeClass('last-visited');
                $(this).addClass('last-visited');
            }
        });

        const savedUseStApi = localStorage.getItem('bazi_use_st_api');
        if (savedUseStApi !== null) $('#bazi_use_st_api').prop('checked', savedUseStApi === 'true');
        $('#bazi_use_st_api').on('change', () => $('#bazi_use_st_api').is(':checked') ? $('#bazi_custom_api_block').slideUp() : $('#bazi_custom_api_block').slideDown());
        if(!$('#bazi_use_st_api').is(':checked')) $('#bazi_custom_api_block').show();

        $('#bazi_apiUrl').val(localStorage.getItem('bazi_api_url') || '');
        $('#bazi_apiKey').val(localStorage.getItem('bazi_api_key') || '');
        if(localStorage.getItem('bazi_gender')) $('#bazi_gender').val(localStorage.getItem('bazi_gender'));
        if(localStorage.getItem('bazi_birthday')) $('#bazi_birthday').val(localStorage.getItem('bazi_birthday'));

        $('#bazi_castBtn').on('click', castLiuyao);
        $('#bazi_sendBtn_Real').on('click', () => executeDivination('real'));
        window.sendRpgRequest = (actionType) => executeDivination('rpg', actionType);
    });

    // ================== 核心调度器 ==================
    async function executeDivination(mode, actionType = null) {
        const useStApi = $('#bazi_use_st_api').is(':checked');
        const apiUrl = $('#bazi_apiUrl').val().trim();
        const apiKey = $('#bazi_apiKey').val().trim();
        const liuyaoData = $('#bazi_liuyaoResultData').val();

        if(!useStApi && (!apiUrl || !apiKey)) return toastr.warning("请在配置中填写 API，或勾选使用酒馆主 API！");
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
            userPrompt = `阳历生日：${$('#bazi_birthday').val()} 性别：${$('#bazi_gender').val()}\n心愿：【${wish}】\n六爻结果：\n${liuyaoData}\n请提供 JSON 格式的阵法指导，包含 summary, hexagram_interpretation, details。`;
            
        } else if (mode === 'rpg') {
            // 通过文档标准的 TavernHelper 获取数据，如果没装则退化为普通上下文
            let charName = "未知角色", charDesc = "未知角色设定";
            if (window.TavernHelper && window.TavernHelper.getCharData) {
                const cData = window.TavernHelper.getCharData('current');
                if (cData) { charName = cData.name; charDesc = cData.description; }
            } else {
                const context = SillyTavern.getContext();
                if (context.characters && context.characterId) {
                    const cData = context.characters[context.characterId];
                    if (cData) { charName = cData.name; charDesc = cData.description; }
                }
            }

            const context = SillyTavern.getContext();
            const userDesc = context.user_persona || "普通人类";
            
            let chatHistory = "暂无近期对话。";
            if (context.chat && context.chat.length > 0) {
                chatHistory = context.chat.slice(-5).map(m => `${m.name}: ${m.mes}`).join('\n');
            }
            
            const extraInput = $('#bazi_rpg_extra_input').val().trim() || "无补充细节";

            systemPrompt = `你现在是一个服务于TRPG文本扮演的“赛博算命GM”。你需要结合角色的底层设定、近期聊天记录，以及用户刚刚抛出的六爻卦象，对后续剧情进行极其专业的推演。\n【核心准则】\n1. 严格按要求输出 JSON 格式。`;
            
            let taskDesc = "";
            if(actionType === 'bond') taskDesc = "测算用户与角色的底层八字姻缘及当前羁绊状态。";
            else if(actionType === 'check') taskDesc = `对用户的行动意图【${extraInput}】进行剧情检定（大成功/成功/失败/大失败），给出判定结果与玄学原因。`;
            else if(actionType === 'event') taskDesc = "基于六爻卦象和世界观，生成一个强烈的随机突发事件（如意外、第三者介入、环境异变），用于打破当前僵局。";
            else if(actionType === 'radar') taskDesc = "为用户寻找目标提供方位、五行元素相关的模糊但绝对有用的玄学雷达线索。";

            userPrompt = `【当前时间】${todayStr}\n【角色设定】${charName}\n${charDesc}\n【用户设定】${userDesc}\n【近期记录】\n${chatHistory}\n【用户补充意图】${extraInput}\n【六爻金钱课结果】\n${liuyaoData}\n【你的GM任务】${taskDesc}\n请严格输出 JSON：\n{\n  "summary": "一句话概括动作意图或旁白（我将放入玩家输入框。如：顺着水声，我发现了密室暗门）",\n  "hexagram_interpretation": "简短六爻卦象解读",\n  "details": "详细的GM裁定规则、情境推演细节（此段将暗中注入给AI作为剧情引导）"\n}`;
        }

        $('.bazi-tab-btn[data-tab="tab-gua"]').click();
        $('#bazi_sendBtn_Real').prop('disabled', true);
        $('#bazi_summary-content, #bazi_hexagram-content, #bazi_details-content').html("灵力流转中...");

        try {
            let aiContentString = "";

            if (useStApi) {
                // 完全遵守 TavernHelper 的 API 文档调用规则
                if (window.TavernHelper && window.TavernHelper.generateRaw) {
                    aiContentString = await window.TavernHelper.generateRaw({
                        ordered_prompts: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ]
                    });
                } else {
                    throw new Error("找不到 TavernHelper 插件！请确保已安装 JS-Slash-Runner，或关闭【使用酒馆当前主 API】采用直连模式。");
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

            // ================== RPG 核心：拆分注入逻辑 ==================
            if (mode === 'rpg') {
                // 1. 摘要：明文给玩家，送进输入框追加，供玩家编辑
                if (aiResult.summary) {
                    appendToChatInput(aiResult.summary);
                }
                
                // 2. 详情：调用 TavernHelper 官方接口，作为系统音暗中塞入 D1
                // 附加 { once: true }，AI 回复一次后当场灰飞烟灭（阅后即焚）！
                if (aiResult.details && window.TavernHelper && window.TavernHelper.injectPrompts) {
                    window.TavernHelper.injectPrompts([{
                        id: "bazi_rpg_inject_" + Date.now(), // 确保ID唯一
                        role: "system",
                        content: `[System Note (GM裁定指令，阅后即焚): ${aiResult.details}]`,
                        position: "in_chat",
                        depth: 1
                    }], { once: true });
                }
                
                // 推演完成，深藏功与名
                $("#bazi_modal_container").fadeOut('fast');
            }

        } catch (error) {
            console.error(error);
            $('#bazi_summary-content').html("⚠️ 测算失败。");
            $('#bazi_details-content').html(error.message);
        } finally {
            $('#bazi_sendBtn_Real').prop('disabled', false);
        }
    }
})();function appendToChatInput(text) {
    const $chatInput = $('#send_textarea');
    if ($chatInput.length) {
        const currentVal = $chatInput.val();
        const addition = `（${text}）`; 
        $chatInput.val(currentVal ? currentVal + '\n' + addition : addition);
        
        $chatInput[0].dispatchEvent(new Event('input', { bubbles: true }));
        $chatInput.trigger('input');
        $chatInput.focus();
        
        toastr.success("✨ 玄学断语已添加到输入框，可继续编辑后发送！");
    } else {
        toastr.error("⚠️ 未能找到酒馆聊天输入框！");
    }
}

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
    const uiHtml = await $.get(`${extensionFolderPath}/bazi_ui.html`);
    $("#extensions_settings").append(uiHtml);

    const modalHtml = await $.get(`${extensionFolderPath}/bazi_modal.html`);
    $("body").append(modalHtml);

    $("#bazi_open_modal_btn").on("click", () => $("#bazi_modal_container").css('display', 'flex').hide().fadeIn('fast'));
    $("#bazi_modal_close").on("click", () => $("#bazi_modal_container").fadeOut('fast'));
    $("#bazi_modal_container").on("click", function(e) { if (e.target === this) $(this).fadeOut('fast'); });

    $('.bazi-tab-btn').on('click', function() {
        $('.bazi-tab-btn').removeClass('active');
        $(this).addClass('active');
        const target = $(this).data('tab');
        $('.bazi-tab-content').removeClass('active');
        $(`#${target}`).addClass('active');
        
        if(target === 'tab-gua') {
            const isFromReal = $('.bazi-tab-btn[data-tab="tab-real"]').hasClass('last-visited');
            $('#bazi_sendBtn_Real').toggle(isFromReal);
        } else {
            $('.bazi-tab-btn').removeClass('last-visited');
            $(this).addClass('last-visited');
        }
    });

    const savedUseStApi = localStorage.getItem('bazi_use_st_api');
    if (savedUseStApi !== null) $('#bazi_use_st_api').prop('checked', savedUseStApi === 'true');
    $('#bazi_use_st_api').on('change', () => $('#bazi_use_st_api').is(':checked') ? $('#bazi_custom_api_block').slideUp() : $('#bazi_custom_api_block').slideDown());
    if(!$('#bazi_use_st_api').is(':checked')) $('#bazi_custom_api_block').show();

    $('#bazi_apiUrl').val(localStorage.getItem('bazi_api_url') || '');
    $('#bazi_apiKey').val(localStorage.getItem('bazi_api_key') || '');
    if(localStorage.getItem('bazi_gender')) $('#bazi_gender').val(localStorage.getItem('bazi_gender'));
    if(localStorage.getItem('bazi_birthday')) $('#bazi_birthday').val(localStorage.getItem('bazi_birthday'));

    setupLocationGroup('bazi_birth'); setupLocationGroup('bazi_live');

    $('#bazi_castBtn').on('click', castLiuyao);
    $('#bazi_sendBtn_Real').on('click', () => executeDivination('real'));
    window.sendRpgRequest = (actionType) => executeDivination('rpg', actionType);
});

function setupLocationGroup(prefix) { }
function getLocationString(prefix) { return "未知地点"; }

// ================== 核心调度器 (通用 API 呼叫) ==================
async function executeDivination(mode, actionType = null) {
    const useStApi = $('#bazi_use_st_api').is(':checked');
    const apiUrl = $('#bazi_apiUrl').val().trim();
    const apiKey = $('#bazi_apiKey').val().trim();
    const liuyaoData = $('#bazi_liuyaoResultData').val();

    if(!useStApi && (!apiUrl || !apiKey)) return toastr.warning("请在配置中填写 API，或勾选使用酒馆主 API！");
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
        userPrompt = `阳历生日：${$('#bazi_birthday').val()} 性别：${$('#bazi_gender').val()}\n心愿：【${wish}】\n六爻结果：\n${liuyaoData}\n请提供 JSON 格式的阵法指导，包含 summary, hexagram_interpretation, details。`;
        
    } else if (mode === 'rpg') {
        const context = SillyTavern.getContext();
        const charData = context.characters && context.characterId ? context.characters[context.characterId] : null;
        const charDesc = charData ? charData.description : "未知角色";
        const charName = charData ? charData.name : "未知角色";
        const userDesc = context.user_persona || "普通人类";
        
        let chatHistory = "暂无近期对话。";
        if (context.chat && context.chat.length > 0) {
            chatHistory = context.chat.slice(-5).map(m => `${m.name}: ${m.mes}`).join('\n');
        }
        
        const extraInput = $('#bazi_rpg_extra_input').val().trim() || "无补充细节";

        systemPrompt = `你现在是一个服务于TRPG文本扮演的“赛博算命GM”。你需要结合角色的底层设定、近期聊天记录，以及用户刚刚抛出的六爻卦象，对后续剧情进行极其专业的推演。\n【核心准则】\n1. 你的推演结果(summary)必须是一句具有旁白或动作指导感的简明断语。\n2. 严格按要求输出 JSON 格式。`;
        
        let taskDesc = "";
        if(actionType === 'bond') taskDesc = "测算用户与角色的底层八字姻缘及当前羁绊状态。";
        else if(actionType === 'check') taskDesc = `对用户的行动意图【${extraInput}】进行剧情检定（大成功/成功/失败/大失败），给出判定结果与玄学原因。`;
        else if(actionType === 'event') taskDesc = "基于六爻卦象和世界观，生成一个强烈的随机突发事件（如意外、第三者介入、环境异变），用于打破当前僵局。";
        else if(actionType === 'radar') taskDesc = "为用户寻找目标提供方位、五行元素相关的模糊但绝对有用的玄学雷达线索。";

        userPrompt = `【当前时间】${todayStr}
【角色设定】${charName}\n${charDesc}
【用户设定】${userDesc}
【近期记录】\n${chatHistory}
【用户补充意图】${extraInput}
【六爻金钱课结果】\n${liuyaoData}

【你的GM任务】${taskDesc}
请严格输出 JSON：
{
  "summary": "一句话判定结果或旁白指令（我将把这句话直接放入玩家的输入框尾部。请简明扼要，如：【大成功】你顺着东南方的水声，发现了密室的暗门）",
  "hexagram_interpretation": "简短的六爻卦象解读",
  "details": "详细的情境推演与建议"
}`;
    }

    $('.bazi-tab-btn[data-tab="tab-gua"]').click();
    $('#bazi_sendBtn_Real').prop('disabled', true);
    $('#bazi_summary-content, #bazi_hexagram-content, #bazi_details-content').html("灵力流转中...");

    try {
        let aiContentString = "";

        if (useStApi) {
            const { generateRaw } = SillyTavern.getContext();
            aiContentString = await generateRaw({ systemPrompt: systemPrompt, prompt: userPrompt });
        } else {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: $('#bazi_modelInput').val(), messages: [ {role: "system", content: systemPrompt}, {role: "user", content: userPrompt} ], response_format: { type: "json_object" } })
            });
            const data = await response.json();
            aiContentString = data.choices[0].message.content;
        }

        aiContentString = aiContentString.replace(/```json/gi, '').replace(/```/g, '').trim();
        const aiResult = JSON.parse(aiContentString);
        
        $('#bazi_summary-content').html(typeof marked !== 'undefined' ? marked.parse(aiResult.summary || "") : aiResult.summary);
        $('#bazi_hexagram-content').html(typeof marked !== 'undefined' ? marked.parse(aiResult.hexagram_interpretation || "") : aiResult.hexagram_interpretation);
        $('#bazi_details-content').html(typeof marked !== 'undefined' ? marked.parse(aiResult.details || "") : aiResult.details);

        if (mode === 'rpg' && aiResult.summary) {
            appendToChatInput(aiResult.summary);
            $("#bazi_modal_container").fadeOut('fast');
        }

    } catch (error) {
        console.error(error);
        $('#bazi_summary-content').html("⚠️ 测算失败，请检查网络或格式。");
        $('#bazi_details-content').html(error.message);
    } finally {
        $('#bazi_sendBtn_Real').prop('disabled', false);
    }
}
