# Gen-work.github.io

[genn.work](https://genn.work) 的源码。培训时手写、在 AI 帮助下搭起来的工作展示站,纯静态 HTML / CSS / JS,无构建步骤。

## 页面

| 文件 | 内容 |
|---|---|
| `index.html` | 首页:简短介绍、精选项目、入口 |
| `AboutMe.html` | 关于我。两个标签页:`#now`(现在)/ `#training`(培训时期的原版,逐字保留) |
| `MyWork.html` | 工作:`#labor`(工作经历阶段列表)→ `#projects`(ebidensu / Claude Usage Monitor / Commute Calibrator,含两个浏览器内小 demo) |
| `Hobby.html` | 爱好:视频、音游手元、翻译 |
| `ContactMe.html` | 联系方式 |
| `SideWork.html` | 旧地址,自动跳转到 `Hobby.html` |

## 结构

- `css/site.css`:全站唯一样式表(GitHub 风格浅色)。
- `js/i18n.js`:中 / 日 / 英三语字典。缺少的键回退到英文。
- `js/site.js`:语言切换(记住选择、首次按浏览器语言、更新 `<html lang>`)、导航当前页、About 标签页、第三方嵌入「点击再加载」、二维码弹窗、demo。
- `Images/projects/`:从各项目仓库 README 复制的截图与动图(均为虚构数据 / 模拟页面)。

## i18n 用法

```html
<p data-i18n="about.now.p1"></p>          <!-- 纯文本 -->
<p data-i18n-html="about.now.p2"></p>     <!-- 含链接等 HTML -->
<div data-i18n-attr="aria-label:lang.label"></div>
```

技术名称、项目名不翻译;培训时期的简介原文保留英文并标注为历史版本。
