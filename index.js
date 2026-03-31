const extensionName = "bazi-gacha-array-test";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

if (typeof marked === 'undefined') {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    document.head.appendChild(script);
}

// ================== 全局变量与状态 ==================
let pcaData = {};
const SPECIAL_PROVS = ["香港特别行政区", "澳门特别行政区", "台湾"];
const OTHER_KEY = "海外及其他地区";

// 用于记录从 Tab2 或 Tab3 传过来的待推演任务
let pendingDivination = { mode: null, actionType: null };
let baziInjectUninjector = null; 
let isBaziEventInjected = false; 

// ================== 本地游戏知识库 ==================
const GameDatabase = [
    {
        name: "恋与深空", keywords: ["恋与深空", "深空"],
        desc: "一款近未来幻想的3D乙女恋爱手游，提供高沉浸互动体验。主控为女性猎人小姐。五星卡分为日卡和月卡，日卡为两张一套，必须抽齐一套才有用，满150抽会送一张用户可自选两张中任意一张；月卡就是单张，和其他游戏相同。",
        characters: [
            { name: "沈星回", info: "生日：10月16日，EVOL属性：光" },
            { name: "黎深", info: "生日：9月5日，EVOL属性：冰" },
            { name: "祁煜", info: "生日：3月6日，EVOL属性：火" },
            { name: "秦彻", info: "生日：4月18日，EVOL属性：能量操控" },
            { name: "夏以昼", info: "生日：6月13日，EVOL属性：引力" }
        ]
    },
    {
        name: "世界之外", keywords: ["世界之外", "世外"],
        desc: "网易开发的无限流言情手游。女性玩家扮演不同角色于副本中完成任务，体验超越现实的甜蜜爱恋。",
        characters: [
            { name: "顾时夜", info: "生日：11月22日" },
            { name: "易遇", info: "生日：12月31日" },
            { name: "柏源", info: "生日：4月15日" },
            { name: "夏萧因", info: "生日：9月10日" }
        ]
    },
    {
        name: "无限暖暖", keywords: ["无限暖暖", "暖暖"],
        desc: "暖暖系列第五代作品，一款多平台开放世界换装冒险游戏，玩家将与大喵在奇迹大陆探索解谜。注：本游戏不抽卡，抽四星阁/五星阁。为服装部件，四星阁5抽保底一件，五星阁20抽保底一件，整套多为8-11件，满进化需抽2套。本游戏不会歪常驻服装。",
        characters: [
            { name: "苏暖暖", info: "生日：12月6日" },
            { name: "暖暖", info: "生日：12月6日" }
        ]
    }
];

function extractGameContext(wishText) {
    let injectedContext = "";
    GameDatabase.forEach(game => {
        let isGameMentioned = game.keywords.some(kw => wishText.includes(kw));
        let mentionedChars = game.characters.filter(c => wishText.includes(c.name));
        if (isGameMentioned || mentionedChars.length > 0) {
            injectedContext += `\n【系统注入补充资料：${game.name}】\n游戏简介：${game.desc}\n相关角色信息：\n`;
            let printedInfos = new Set();
            let targetChars = (isGameMentioned && mentionedChars.length === 0) ? game.characters : mentionedChars;
            targetChars.forEach(c => {
                if (!printedInfos.has(c.info)) {
                    injectedContext += `- ${c.name}: ${c.info}\n`;
                    printedInfos.add(c.info);
                }
            });
        }
    });
    return injectedContext;
}

// ================== 前端 64卦 硬核映射表 ==================
const hexagramMap = {
    "111111":"乾为天", "000000":"坤为地", "100010":"水雷屯", "010001":"山水蒙", "111010":"水天需", "010111":"天水讼", "010000":"地水师", "000010":"水地比", "111011":"风天小畜", "110111":"天泽履", "111000":"地天泰", "000111":"天地否", "101111":"天火同人", "111101":"火天大有", "001000":"地山谦", "000100":"雷地豫", "100110":"泽雷随", "011001":"山风蛊", "110000":"地泽临", "000011":"风地观", "100101":"火雷噬嗑", "101001":"山火贲", "000001":"山地剥", "100000":"地雷复", "100111":"天雷无妄", "111001":"山天大畜", "100001":"山雷颐", "011110":"泽风大过", "010010":"坎为水", "101101":"离为火", "001110":"泽山咸", "011100":"雷风恒", "001111":"天山遁", "111100":"雷天大壮", "000101":"火地晋", "101000":"地火明夷", "101011":"风火家人", "110101":"火泽睽", "001010":"水山蹇", "010100":"雷水解", "110001":"山泽损", "100011":"风雷益", "111110":"泽天夬", "011111":"天风姤", "000110":"泽地萃", "011000":"地风升", "010110":"泽水困", "011010":"水风井", "101110":"泽火革", "011101":"火风鼎", "100100":"震为雷", "001001":"艮为山", "001011":"风山渐", "110100":"雷泽归妹", "101100":"雷火丰", "001101":"火山旅", "011011":"巽为风", "110110":"兑为泽", "010011":"风水涣", "110010":"水泽节", "110011":"风泽中孚", "001100":"雷山小过", "101010":"水火既济", "010101":"火水未济"
};

function resolveApi(fnName) {
    if (typeof window !== 'undefined' && typeof window[fnName] === 'function') return window[fnName];
    if (typeof window !== 'undefined' && window.TavernHelper && typeof window.TavernHelper[fnName] === 'function') return window.TavernHelper[fnName];
    if (typeof globalThis !== 'undefined' && typeof globalThis[fnName] === 'function') return globalThis[fnName];
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
            toastr.success("✨ GM推演已添加到输入框");
        } else {
            toastr.error("⚠️ 未能找到酒馆聊天输入框！");
        }
    } catch (err) {
        console.error("追加输入框报错:", err);
    }
}

// ================== 省市区联动功能 ==================
function setupLocationGroup(prefix) {
    const group = $(`#${prefix}-group`);
    if(group.length === 0) return; // 如果UI还没加载不报错
    const provSelect = group.find('.prov');
    provSelect.empty().append('<option value="">请选择省份</option>');
    for (let prov in pcaData) provSelect.append(new Option(prov, prov));
    
    provSelect.on('change', () => updateCity(prefix));
    group.find('.city').on('change', () => updateDist(prefix));
}

function updateCity(prefix) {
    const group = $(`#${prefix}-group`);
    const prov = group.find('.prov').val();
    const citySelect = group.find('.city').empty().append('<option value="">请选择城市</option>');
    const distSelect = group.find('.dist').empty().append('<option value="">请选择区县</option>');
    const otherInput = group.find('.other');
    
    if (!prov) { citySelect.show(); distSelect.show(); otherInput.hide(); return; }
    if (prov === OTHER_KEY) { citySelect.hide(); distSelect.hide(); otherInput.show(); }
    else if (SPECIAL_PROVS.includes(prov) || pcaData[prov] === "special") { citySelect.hide(); distSelect.hide(); otherInput.hide(); }
    else {
        citySelect.show(); distSelect.show(); otherInput.hide();
        for (let c in pcaData[prov]) citySelect.append(new Option(c, c));
    }
}

function updateDist(prefix) {
    const group = $(`#${prefix}-group`);
    const prov = group.find('.prov').val();
    const city = group.find('.city').val();
    const distSelect = group.find('.dist').empty().append('<option value="">请选择区县</option>');
    if(city && pcaData[prov] && pcaData[prov][city]) {
        pcaData[prov][city].forEach(d => distSelect.append(new Option(d, d)));
    }
}

function getLocationString(prefix) {
    const group = $(`#${prefix}-group`);
    if(group.length === 0) return "未知地区";
    const prov = group.find('.prov').val();
    if (!prov) return "";
    if (prov === OTHER_KEY) return group.find('.other').val().trim();
    if (SPECIAL_PROVS.includes(prov)) return prov;
    return `${prov}${group.find('.city').val()}${group.find('.dist').val()}`;
}

// ================== 起卦引擎 ==================
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
    $('#bazi_liuyaoResultData').val(`【前端推算结果】本卦：${benGua}，变卦：${bianGua}\n【抛掷结果】\n${resultsTextForAI}`);
    $('#bazi_castBtn').text("☯️ 心诚则灵 点击重新起卦").css("background-color", "#666");
}

// ================== 前置准备调度器 (绑定在Tab 2/3 的按钮上) ==================
window.sendRpgRequest = (actionType) => prepareDivination('rpg', actionType);

function prepareDivination(mode, actionType = null) {
    // 1. 先进行表单校验
    if (mode === 'real') {
        const wish = $('#bazi_wish_real').val().trim();
        const birthday = $('#bazi_birthday').val();
        const birthPlace = getLocationString('bazi_birth');
        const livePlace = getLocationString('bazi_live');

        if(!wish) return toastr.warning("请填写现实心愿");
        if(!birthday) return toastr.warning("请选择阳历生日");
        if(!birthPlace || !livePlace) return toastr.warning("请完整填写出生地和现居地");
        
        // 保存数据方便下次自动填充
        localStorage.setItem('bazi_gender', $('#bazi_gender').val());
        localStorage.setItem('bazi_birthday', birthday);
    } else if (mode === 'rpg') {
        const extraInput = $('#bazi_rpg_extra_input').val().trim();
        if ((actionType === 'check' || actionType === 'other') && !extraInput) {
            return toastr.warning("推演需要您先在文本框填写具体的愿望");
        }
    }

    // 2. 存入全局待执行任务
    pendingDivination = { mode, actionType };

    // 3. 后台起卦
    castLiuyao();

    // 4. 自动跳到 Tab 4
    $('.bazi-tab-btn[data-tab="tab-gua"]').click();
    toastr.success("☯️ 卦象已自动生成！请确认后点击【正式发送推演】交由大师结印。");
}

// ================== 系统初始化 ==================
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

    // 阅后即焚防弹衣监听
    if (typeof SillyTavern !== 'undefined' && SillyTavern.eventSource) {
        SillyTavern.eventSource.on(SillyTavern.eventTypes.GENERATION_ENDED, async () => {
            if (baziInjectUninjector) {
                baziInjectUninjector(); 
                baziInjectUninjector = null;
            }
            if (isBaziEventInjected) {
                const execSlash = resolveApi('executeSlashCommandsWithOptions') || (typeof SillyTavern !== 'undefined' ? SillyTavern.executeSlashCommandsWithOptions : null);
                if (execSlash) {
                    await execSlash('/flushinject bazi_rpg_inject');
                    isBaziEventInjected = false;
                }
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
    if(localStorage.getItem('bazi_gender')) $('#bazi_gender').val(localStorage.getItem('bazi_gender'));
    if(localStorage.getItem('bazi_birthday')) $('#bazi_birthday').val(localStorage.getItem('bazi_birthday'));

    // 🟢 加载省市区 JSON 数据
    try {
        const res = await fetch('https://cdn.jsdelivr.net/gh/modood/Administrative-divisions-of-China/dist/pca.json');
        const rawData = await res.json();
        let orderedData = {};
        for (let prov in rawData) {
            if (!SPECIAL_PROVS.includes(prov)) orderedData[prov] = rawData[prov];
        }
        SPECIAL_PROVS.forEach(sp => { orderedData[sp] = "special"; });
        orderedData[OTHER_KEY] = "other";
        pcaData = orderedData;
        $('#bazi_birth-loading').text(""); 
    } catch (e) {
        pcaData = {}; 
        SPECIAL_PROVS.forEach(sp => { pcaData[sp] = "special"; });
        pcaData[OTHER_KEY] = "other";
        $('#bazi_birth-loading').text("(离线)"); 
    }

    setupLocationGroup('bazi_birth');
    setupLocationGroup('bazi_live');
    

    $('#bazi_castBtn').on('click', castLiuyao); // 这是在Tab4点击重新抛掷的按钮


    $('#bazi_sendBtn_Real').text("☯️ 起卦并准备推演").off('click').on('click', () => prepareDivination('real'));


    if ($('#bazi_executeBtn').length === 0) {
        // 将执行按钮直接加在重新起卦按钮的后面
        $('#bazi_castBtn').after('<button id="bazi_executeBtn" style="margin-left: 10px; background-color: #2e8b57; color: white; padding: 5px 15px; border-radius: 5px; border: none; cursor: pointer;">🙏 正式向AI发送推演</button>');
    }
    $('#bazi_executeBtn').off('click').on('click', executePendingDivination);
});

// ================== 核心 AI 请求与分配调度器 ==================
async function executePendingDivination() {
    const { mode, actionType } = pendingDivination;

    if (!mode) {
        return toastr.warning("请先在 现实推演 或 角色卡推演 标签页填写需求并点击起卦！");
    }

    const useStApi = $('#bazi_use_st_api').is(':checked');
    const apiUrl = $('#bazi_apiUrl').val().trim();
    const apiKey = $('#bazi_apiKey').val().trim();
    const liuyaoData = $('#bazi_liuyaoResultData').val();

    if(!useStApi && (!apiUrl || !apiKey)) return toastr.warning("请填写自定义 API，或勾选使用酒馆主 API！");
    if(!liuyaoData) return toastr.warning("【系统异常】未检测到卦象数据，请尝试重新起卦！");

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}年${todayDate.getMonth() + 1}月${todayDate.getDate()}日`;

    let systemPrompt = "";
    let userPrompt = "";

    // ============= Prompt 组装 =============
    if (mode === 'real') {
        const wish = $('#bazi_wish_real').val().trim();
        const gender = $('#bazi_gender').val();
        const birthday = $('#bazi_birthday').val();
        let birthTime = $('#bazi_birthTime').length ? $('#bazi_birthTime').val().trim() : "任选当天吉时";
        const birthPlace = getLocationString('bazi_birth');
        const livePlace = getLocationString('bazi_live');

        const gameInfo = extractGameContext(wish);

        systemPrompt = `你现在是一个精通《周易》卦爻辞及体用生克之法，且深谙中国传统八字命理的专业研究人员。你熟读穷通宝典、三命通会、滴天髓、渊海子平、千里命稿、协纪辨方书、果老星宗、子平真诠、神峰通考等一系列书籍。
在传统命理的架构中，八字与六爻对应着宏观的“体”与微观的“用”。推演需严格遵循以下规则：
第一，理清尺度：八字是先天定局加流年演播，定大势。六爻讲究“无事不占，不动不占”，捕捉起心动念瞬间的微观气运。
第二，拒绝线性思维：绝不能因八字走财运，就判定用户其她所有博弈皆稳赢。若六爻显现财爻受克或兄弟劫财，依然会翻车。“八字决定能赢多少，六爻决定这一把输赢”。
第三，必须严格遵循“先观命理之大势，再决行事之进退”的固定次序（先命后卜）。

【日期推演】(最重要)
当前现实日期是：${todayStr}。
请在推演前，先根据用户的【愿望内容】确立“起始日期”：
1. 若用户愿望中包含完整日期或相对时间（如明天、下周三、下个月某号），请以 ${todayStr} 为基准推算出具体的“起始日期”。
2. 若用户愿望中未提及任何时间，则默认“起始日期”为 ${todayStr}（今天）。
3. 如果起始日期的推演结果为“大忌(凶)”，你需要为用户另择吉日，择日范围必须限制在【起始日期】至【起始日期后7天】内。`;

        userPrompt = `下面是要根据用户输入组合的信息：
用户阳历生日是：${birthday}
出生时间是：${birthTime}
出生在：${birthPlace}
现住：${livePlace}
性别：${gender}。
${gameInfo}
愿望内容：【${wish}】

【用户刚刚针对该愿望起的六爻金钱课结果】
${liuyaoData}

请你结合四柱八字大盘与上述已推算好的六爻本卦/变卦，根据你所熟读的书籍经验学习一下，具体在什么时间，在家里朝向哪方，口号什么的，根据常见谷子五行分类如何利用元素相关谷子摆阵，能让【${wish}】比较欧？

【以下内容务必遵守】
1. 时辰和朝向必须反复测算至少5次。
2. 口号必须结合愿望，避免生僻字，简洁好记。
3. 如果遇到突发情况，请在总结中提供调整方案。

请严格输出纯净 JSON，不要包含额外文本：
{
  "summary": "一句话总结（如：明日午时面朝东南大喊xx口号等）",
  "hexagram_interpretation": "针对本卦与变卦的解读，简洁通俗易懂",
  "details": "具体的执行步骤、详细解释（包括八字简析、时间、方位、阵法等详细内容）"
}`;
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
            console.warn("🔮 抓取酒馆上下文警告:", ctxErr);
        }
        
        const extraInput = $('#bazi_rpg_extra_input').val().trim() || "无补充细节";

        systemPrompt = `【停止小说续写，仅推演八字六爻】\n你现在是一个服务于TRPG文本扮演的“修仙GM”。你精通《周易》卦爻辞及体用生克之法，且深谙中国传统八字命理的专业研究人员。你熟读穷通宝典、三命通会、滴天髓、渊海子平、千里命稿、协纪辨方书、果老星宗、子平真诠、神峰通考等一系列书籍。
在传统命理的架构中，八字与六爻对应着宏观的“体”与微观的“用”。结合角色的底层设定、近期聊天记录，以及用户抛出的六爻卦象对后续剧情进行推演,你需严格遵循以下规则：
第一，理清尺度：八字是先天定局加流年演播，定大势。六爻讲究“无事不占，不动不占”，捕捉起心动念瞬间的微观气运。
第二，拒绝线性思维：绝不能因八字走财运，就判定用户其她所有博弈皆稳赢。若六爻显现财爻受克或兄弟劫财，依然会翻车。“八字决定能赢多少，六爻决定这一把输赢”。
第三，必须严格遵循“先观命理之大势，再决行事之进退”的固定次序（先命后卜）。\n此外，你必须：\n1. 必须输出合法、纯净的 JSON 格式！绝对不要在 JSON 里加任何 // 注释！\n2. 不要发散写小说。summary字段是你作为GM给出的推演精华。`;
        
        let taskDesc = "";
        if(actionType === 'bond') {
            taskDesc = "根据【角色设定】和【用户设定】测算<user>与角色的八字（如果信息不够可以参考用户阳历生日 ${birthday} 出生时间 ${birthTime} ),推演姻缘及当前羁绊状态。请在summary中结合双方八字，本卦以及变卦，给出一句凝练、适合作为被动设定的合八字结果（例如：命理互补，金水相生，对<user>有天然的信任）。";
        } else if(actionType === 'check') {
            taskDesc = `对【近期记录】中的剧情进展和【${extraInput}】的补充进行剧情检定（大成功/成功/失败/大失败），给出判定结果与玄学原因。`;
        } else if(actionType === 'event') {
            taskDesc = "结合八字本卦以及变卦，在【近期记录】末尾当前剧情点生成一个随机突发事件（如意外、第三者介入、环境异变），来推进剧情。必须符合推演结果";
        } else if(actionType === 'radar') {
            taskDesc = "结合八字本卦以及变卦为用户寻找目标提供方位、五行元素相关的模糊但绝对有用的玄学雷达线索。并给出这个线索有用的玄学理由";
        } else if(actionType === 'other') {
            taskDesc = `【自由推演】：请根据用户的补充意图【${extraInput}】，严格基于八字六爻与角色世界观给出合理的玄学解读。`;
        }

        userPrompt = `【当前时间】${todayStr}\n【角色设定】${charName}\n${charDesc}\n【用户设定】${userDesc}\n【近期记录】\n${chatHistory}\n【用户补充意图】${extraInput}\n【六爻金钱课结果】\n${liuyaoData}\n【你的GM任务】${taskDesc}\n请严格输出纯净 JSON，不要任何其他废话：\n{\n  "summary": "（填入一句话判定或羁绊设定）",\n  "hexagram_interpretation": "（填入六爻卦象解读）",\n  "details": "（填入详细的情境推演细节）"\n}`;
    }

    // ============= 发送请求 =============
    $('#bazi_executeBtn').text("⏳ 灵力流转中...").prop('disabled', true);
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

        // ============= 后续动作分配 =============
        const fnUpdateCharacterWith = resolveApi('updateCharacterWith');
        const fnGetCharacter = resolveApi('getCharacter');
        const fnReplaceCharacter = resolveApi('replaceCharacter');
        const fnInjectPrompts = resolveApi('injectPrompts');

        if (mode === 'rpg' && aiResult.summary) {
            // 🟢 针对 "其他玩法 (other)"：只展示不污染环境！
            if (actionType === 'other') {
                toastr.success("✅ 自由推演完成！结果已显示在面板中。");
            } 
            else if (actionType !== 'bond') {
                // 原有动作逻辑
                appendToChatInput(aiResult.summary);
                if (aiResult.details) {
                    if (fnInjectPrompts) {
                        const safeDetails = aiResult.details.replace(/\n/g, ' ');
                        const injectResult = fnInjectPrompts([{
                            id: "bazi_rpg_inject", position: 'in_chat', depth: 1, role: 'system',
                            content: `[System Note(玄学判定,阅后即焚): ${safeDetails}]`, should_scan: false
                        }], { once: false }); 
                        if (injectResult && typeof injectResult.uninject === 'function') baziInjectUninjector = injectResult.uninject;
                    } else {
                        const safeDetails = aiResult.details.replace(/\|/g, ' ').replace(/\n/g, ' ');
                        const injectCmd = `/inject id=bazi_rpg_inject position=chat depth=1 role=system [System Note(玄学判定,阅后即焚): ${safeDetails}]`;
                        const execSlash = resolveApi('executeSlashCommandsWithOptions') || (typeof SillyTavern !== 'undefined' ? SillyTavern.executeSlashCommandsWithOptions : null);
                        if (execSlash) {
                            await execSlash(injectCmd);
                            isBaziEventInjected = true; 
                        }
                    }
                }
            } else {
                // 羁绊逻辑（暂时放着）
                try {
                    const bondMarker = "【八字玄学羁绊】：";
                    const newBondText = `${bondMarker}${aiResult.summary}`;

                    if (fnUpdateCharacterWith) {
                        await fnUpdateCharacterWith('current', char => {
                            if (char.description.includes(bondMarker)) {
                                char.description = char.description.replace(new RegExp("【八字玄学羁绊】：.*"), newBondText);
                            } else {
                                char.description += `\n${newBondText}`;
                            }
                            return char;
                        });
                        toastr.success("💘 姻缘羁绊已成功写入并保存至角色卡描述中！");
                    } 
                    else if (fnGetCharacter && fnReplaceCharacter) {
                        const char = await fnGetCharacter('current');
                        if (char.description.includes(bondMarker)) {
                            char.description = char.description.replace(new RegExp("【八字玄学羁绊】：.*"), newBondText);
                        } else {
                            char.description += `\n${newBondText}`;
                        }
                        await fnReplaceCharacter('current', char);
                        toastr.success("💘 姻缘羁绊已通过基础接口写入并保存至角色卡描述中！");
                    } 
                    else {
                        toastr.warning("⚠️ 写入角色卡失败：未检测到酒馆助手的修改 API。");
                    }
                } catch (charErr) {
                    console.error("写入角色卡失败:", charErr);
                    toastr.error("❌ 写入角色卡发生异常，请检查控制台报错。");
                }
            }
        } else if (mode === 'real') {
             toastr.success("✅ 三次元推演完成！");
        }

    } catch (error) {
        console.error("❌ 测算报错:", error);
        $('#bazi_summary-content').html("⚠️ 测算失败。");
        $('#bazi_details-content').html(error.message);
    } finally {
        $('#bazi_executeBtn').text("🙏 正式向AI发送推演").prop('disabled', false);
    }
}
