import { defineConfig } from 'vitepress';

const base = process.env.DOCS_BASE || '/';

export default defineConfig({
  lang: 'zh-CN',
  title: 'Shadow Dream',
  description: '影梦 · 把 QQ 接入 OneBot 11 的轻量运行时',
  base,
  cleanUrls: true,
  head: [
    ['meta', { name: 'theme-color', content: '#0b1220' }],
    ['meta', { name: 'og:type', content: 'website' }],
  ],
  themeConfig: {
    nav: [
      { text: '开始', link: '/guide/introduction' },
      { text: '部署', link: '/guide/install' },
      { text: '排故', link: '/guide/troubleshooting' },
      { text: 'API', link: '/api/onebot' },
      { text: '更新日志', link: 'https://github.com/derammeng/Shadow-Dream/blob/main/CHANGELOG.md' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: 'Shadow Dream 是什么', link: '/guide/introduction' },
            { text: '安装', link: '/guide/install' },
            { text: '启动', link: '/guide/start' },
          ],
        },
        {
          text: '使用',
          items: [
            { text: 'WebUI 与 token', link: '/guide/webui' },
            { text: 'QQNT 插件', link: '/guide/qqnt' },
            { text: 'Linux 无头运行', link: '/guide/headless' },
            { text: '接入 Koishi', link: '/guide/koishi' },
          ],
        },
        {
          text: '上线',
          items: [
            { text: '公网安全', link: '/guide/public' },
            { text: '常见问题', link: '/guide/troubleshooting' },
          ],
        },
      ],
      '/api/': [
        {
          text: '接口',
          items: [
            { text: 'OneBot 11', link: '/api/onebot' },
            { text: 'WebUI API', link: '/api/webui' },
          ],
        },
      ],
    },
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/derammeng/Shadow-Dream' },
    ],
    editLink: {
      pattern: 'https://github.com/derammeng/Shadow-Dream/edit/main/docs-site/:path',
      text: '在 GitHub 上编辑此页',
    },
    docFooter: { prev: '上一页', next: '下一页' },
    outline: { level: [2, 3], label: '本页目录' },
    lastUpdated: {
      text: '最后更新',
      formatOptions: { dateStyle: 'short', timeStyle: 'short' },
    },
    footer: {
      message: 'Shadow Dream · 影梦',
      copyright: 'MIT License',
    },
  },
});
