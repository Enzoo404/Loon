/**
 * 彩云天气Pro净化和Svip解锁脚本 (Loon 3.5.1+)
 */

const url = $request.url;
const body = $response.body;

function looksLikeJSON(str) {
  if (!str) return false;
  const s = str.trim();
  return (s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"));
}

function clearPromotions(obj) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj.popups)) obj.popups = [];
  if (Array.isArray(obj.actions)) obj.actions = [];
  if (Array.isArray(obj.results)) obj.results = [];
}

function injectSvip(target) {
  if (!target || typeof target !== "object") return;
  const expireTime = 4092609600;
  const vipData = {
    is_auto_renewal: true,
    expires_time: String(expireTime)
  };

  target.is_vip = 1;
  target.vip_type = "s";
  target.svip_take_effect = 1;
  target.svip_expired_at = expireTime;
  target.vip_expired_at = expireTime;
  target.is_primary = true;
  target.primary = 1;
  target.is_xy_vip = true;
  target.xy_svip_expire = expireTime;
  target.xy_vip_expire = expireTime;
  target.svip_given = 1;
  target.show_upcoming_renewal = false;

  target.wt = target.wt || {};
  target.wt.vip = Object.assign({}, target.wt.vip, {
    enabled: true,
    is_vip: 1,
    svip_take_effect: 1,
    vip_type: "s",
    expired_at: expireTime,
    svip_expired_at: expireTime,
    is_auto_renewal: true,
    svip_auto_renewal: true
  });

  target.vip = Object.assign({}, target.vip, vipData);
  target.svip = Object.assign({}, target.svip, vipData);
  if (target.vip_info) {
    target.vip_info.show_upcoming_renewal = false;
    target.vip_info.vip = Object.assign({}, target.vip_info.vip, vipData);
    target.vip_info.svip = Object.assign({}, target.vip_info.svip, vipData);
  }
}

if (!looksLikeJSON(body)) {
  $done({});
} else {
  let modified = false;
  let obj;

  try {
    obj = JSON.parse(body);

    // 1. 页面推广与弹窗清理 (home, home_activity, personal, serves_personal)
    if (url.includes("/config/cypage/")) {
      clearPromotions(obj);
      modified = true;
    }

    // 2. SSL Pinning 证书校验绕过
    else if (url.includes("/api/v1/certificates")) {
      obj.certificates = obj.certificates || [];
      obj.certificates.push({
        public_key_hash: "v9R+4QJoj9EOcWcB1kJLK1fUKDxcbq43sFWrZ+EAqlc="
      });
      modified = true;
    }

    // 3. 天气主接口 48 小时预报与气象图权限打通
    else if (/^https?:\/\/wrapper\.cyapi\.cn\/v2\.\d+\/[^/]+\/[^/]+\/(weather|hourly|realtime)/.test(url)) {
      if (obj.result) {
        obj.result.primary = 1;
        obj.result.is_primary = true;
        obj.result.is_vip = 1;
        obj.result.vip_type = "s";
        obj.result.svip_take_effect = 1;
        obj.result.svip_expired_at = 4092609600;
      }
      obj.primary = 1;
      obj.is_vip = 1;
      obj.vip_type = "s";
      obj.svip_take_effect = 1;
      modified = true;
    }

    // 4. 用户与会员鉴权接口
    else if (
      /\/(api\/v1\/user_detail|p\/v1\/(user_info|vip_info)|v3\/config\/membership)/.test(url)
    ) {
      injectSvip(obj);
      if (obj.result) injectSvip(obj.result);
      modified = true;
    }

    // 5. 底栏 AI 助手与活动入口屏蔽
    else if (url.includes("/v1/activity")) {
      obj.status = "ok";
      obj.interval = 2592000;
      obj.activities = url.includes("type_id=A03")
        ? [{ type: "tabbar", name: "aichat", feature: false }]
        : [];
      modified = true;
    }

    // 6. 个人中心工具箱与运营模块清理
    else if (/\/operation\/(features|homefeatures|feeds|banners)/.test(url)) {
      obj = { status: "ok", data: [] };
      modified = true;
    }

    // 7. 消息中心营销通知清理
    else if (url.includes("/notification/message_center")) {
      obj = { status: "ok", messages: [] };
      modified = true;
    }
  } catch (e) {
    modified = false;
  }

  $done(modified ? { body: JSON.stringify(obj) } : {});
}
