/**
 * 单进程测试入口。
 *
 * 当前执行环境禁止测试运行器为每个文件 spawn 子进程，所以按依赖顺序
 * 直接 import 所有测试文件，让 node:test 在当前进程里调度。
 */
import './segment.test.js';
import './message-id.test.js';
import './config.test.js';
import './page.test.js';
import './http.test.js';
import './http-post.test.js';
import './ws.test.js';
