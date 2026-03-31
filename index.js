import { hexagramMap } from './hexagram_data.js';

const extensionName = "bazi-gacha-array";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

if (typeof marked === 'undefined') {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    document.head.appendChild(script);
}

let pcaData = {};
const SPECIAL_PROVS = ["香港特别行政区", "澳门特别行政区", "台湾"];
const OTHER_KEY = "海外及其他地区";

// 游戏数据库保持不变...
const GameDatabase = [
  { name: "恋与深空", keywords: ["恋与深空", "深空"], desc: "一款近未来幻想的3D乙女恋爱手游...五星卡满150抽会送一张用户可自选；月卡就是单张。", characters: [] },
  { name: "世界之外", keywords: ["世界之外", "世外"], desc: "网易开发的无限流言情手游。", characters: [] },
  { name: "无限暖暖", keywords: ["无限暖暖", "暖暖"], desc: "本游戏不抽卡，抽服装部件，四星阁5抽保底，五星阁20抽保底，不会歪常驻服装。", characters: [] }
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
        const addition = `（${text}）`; // 使用括号包裹
        // 拼接：如果有原文则换行加括号，没有则直接加括号
        $chatInput.val(currentVal ? currentVal + '\n' + addition : addition);
        
        // 触发 input 事件，打通酒馆底层 React 的双向绑定和文本域自适应变高
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

    // 打开/关闭面板
    $("#bazi_open_modal_btn").on("click", () => $("#bazi_modal_container").css('display', 'flex').hide().fadeIn('fast'));
    $("#bazi_modal_close").on("click", () => $("#bazi_modal_container").fadeOut('fast'));
    $("#bazi_modal_container").on("click", function(e) { if (e.target === this) $(this).fadeOut('fast'); });

    // Tab 切换逻辑
    $('.bazi-tab-btn').on('click', function() {
        $('.bazi-tab-btn').removeClass('active');
        $(this).addClass('active');
        const target = $(this).data('tab');
        $('.bazi-tab-content').removeClass('active');
        $(`#${target}`).addClass('active');
        
        // 动态显示隐藏“现实排盘”按钮
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

    // 恢复基础数据
    $('#bazi_apiUrl').val(localStorage.getItem('bazi_api_url') || '');
    $('#bazi_apiKey').val(localStorage.getItem('bazi_api_key') || '');
    if(localStorage.getItem('bazi_gender')) $('#bazi_gender').val(localStorage.getItem('bazi_gender'));
    if(localStorage.getItem('bazi_birthday')) $('#bazi_birthday').val(localStorage.getItem('bazi_birthday'));

    // 省市区初始化略 (保留之前逻辑，确保不崩)
    setupLocationGroup('bazi_birth'); setupLocationGroup('bazi_live');

    $('#bazi_castBtn').on('click', castLiuyao);
    $('#bazi_sendBtn_Real').on('click', () => executeDivination('real'));
    window.sendRpgRequest = (actionType) => executeDivination('rpg', actionType);
});

// 省市区工具函数略 (和之前完全一样)
function setupLocationGroup(prefix) { /* 需保留之前的空架子防报错 */ }
function getLocationString(prefix) { return "未知地点"; } // 简写防崩，如果你有 pca.json 保留之前的函数体

// ================== 核心调度器 (通用 API 呼叫) ==================
async function executeDivination(mode, actionType = null) {
    const useStApi = $('#bazi_use_st_api').is(':checked');
    const apiUrl = $('#bazi_apiUrl').val().trim();
    const apiKey = $('#bazi_apiKey').val().trim();
    const liuyaoData = $('#bazi_liuyaoResultData').val();

    if(!useStApi && (!apiUrl || !apiKey)) return toastr.warning("请在配置中填写 API，或勾选使用酒馆主 API！");
    if(!liuyaoData) {
        // 如果没起卦，强制跳转到起卦页
        $('.bazi-tab-btn[data-tab="tab-gua"]').click();
        return toastr.warning("【警告】请先点击按钮抛掷三枚铜钱起卦！");
    }

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}年${todayDate.getMonth() + 1}月${todayDate.getDate()}日`;

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === 'real') {
        // === 三次元排盘逻辑 ===
        const wish = $('#bazi_wish_real').val().trim();
        if(!wish) return toastr.warning("请在三次元标签页填写现实心愿！");
        
        systemPrompt = `你现在是一个精通《周易》卦爻辞及八字命理的专业人员。\n【日期推演】当前日期：${todayStr}。请确立起始日期，若凶则在7日内另择吉日...`;
        userPrompt = `阳历生日：${$('#bazi_birthday').val()} 性别：${$('#bazi_gender').val()}\n心愿：【${wish}】\n六爻结果：\n${liuyaoData}\n请提供 JSON 格式的阵法指导，包含 summary, hexagram_interpretation, details。`;
        
    } else if (mode === 'rpg') {
        // === 跑团推演逻辑 ===
        const context = SillyTavern.getContext();
        const charData = context.characters ? context.characters[context.characterId] : null;
        const charDesc = charData ? charData.description : "未知角色";
        const charName = charData ? charData.name : "未知角色";
        const userDesc = context.user_persona || "普通人类";
        
        // 抓取近期 5 楼聊天
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

    // 强制切换到 Tab 4 显示 loading 状态
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
        
        $('#bazi_summary-content').html(marked.parse(aiResult.summary || ""));
        $('#bazi_hexagram-content').html(marked.parse(aiResult.hexagram_interpretation || ""));
        $('#bazi_details-content').html(marked.parse(aiResult.details || ""));

        // ======= RPG 模式独有：将 summary 填入输入框 =======
        if (mode === 'rpg' && aiResult.summary) {
            appendToChatInput(aiResult.summary);
            // 推演完成后关闭面板，让玩家专心聊天
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
