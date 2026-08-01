---
title: '如何开启 GitHub 各大宝藏项目基础课（以某分支 llama.cpp 为例）'
description: '以 llama.cpp 分支为例，介绍如何从 GitHub 中发现、克隆、编译并运行一个宝藏项目。'
pubDate: '2026-08-01'
updatedDate: '2026-08-01'
heroImage: '../../assets/blog-placeholder-1.jpg'
---

> 前言：示例的是群主用的某个 llama.cpp 分支：TheTom/llama-cpp-turboquant。它的主要好处是可以极致压缩大模型的 KV 缓存。显存充裕，或者 CUDA 版本和项目方推荐一致时，可以下载预编译版本；主分支的预编译版本也通常是最丰富的。

# 第一步：新建一个文件夹（英文），打好地基

![项目目录示意](/images/tutorials/pasted-image-20260727184719.png)

# 第二步：找到 PowerShell，打开它，后面主要在这里操作

![PowerShell 入口](/images/tutorials/pasted-image-20260727185048.png)

## 2.1 在 PowerShell 里克隆仓库

```powershell
cd E:\llamacpp-test
```

```powershell
git clone https://github.com/TheTom/llama-cpp-turboquant.git
```

如图：

![克隆仓库示意](/images/tutorials/pasted-image-20260727192054.png)

## 2.2 切换进入项目目录

```powershell
cd llama-cpp-turboquant
```

如图：

![进入项目目录](/images/tutorials/pasted-image-20260727192517.png)

# 第三步：验证编译器环境

执行这条命令查看 nvcc 版本：

```powershell
nvcc -V
```

如图：

![nvcc 版本示意](/images/tutorials/pasted-image-20260727192928.png)

如果没有类似上图的提示，代表你没有安装 CUDA。把错误提示贴给豆包或任何 AI，告诉 AI 你的显卡型号，并在 AI 指导下安装修复。群主用的是 CUDA 13.1，50 系列的 N 卡。

重点：安装完后要确认 CUDA 已添加到 PATH 路径中。

Windows 编译必须使用 VS2022 生成工具环境。

执行这条命令，验证 MSVC 编译器是否可用：

```powershell
cl.exe
```

正常结果如下：

![MSVC 编译器示意](/images/tutorials/pasted-image-20260727194351.png)

如果没有类似上图的提示，出现 `'cl.exe' 不是内部或外部命令`，说明当前普通 PowerShell 缺少 VS 编译环境，需要切换打开 x64 Native Tools Command Prompt for VS 2022，或者开发者 PowerShell 再继续。

把错误提示贴给豆包或任何 AI，在 AI 指导下安装修复。

确保 MSVC x64 编译器、CUDA 13.1 均就绪后再继续。

# 第四步：开始编译

## 4.1 创建编译构建目录

继续在当前路径执行：

```powershell
mkdir build
cd build
```

如图：

![创建 build 目录](/images/tutorials/pasted-image-20260727195011.png)

## 4.2 开始编译

现在执行 CMake 配置命令（适配 Win11、CUDA13.1，启用 GPU 加速）：

```powershell
cmake .. -G "Visual Studio 17 2022" -DLLAMA_CUDA=ON
```

一直等它跑完，需要一点时间：

![CMake 配置界面](/images/tutorials/pasted-image-20260727195405.png)

下面是成功界面：

![CMake 成功界面](/images/tutorials/pasted-image-20260727195435.png)

如果出现警告暂时不用紧张，重点观察有没有红色错误。同样，把错误贴给 AI。

如果成功了，接着执行编译命令：

```powershell
cmake --build . --config Release
```

编译耗时预计 3～8 分钟，取决于 CPU 性能。

![编译中界面](/images/tutorials/pasted-image-20260727195908.png)

不要中途关闭终端；直到出现：

![编译完成界面](/images/tutorials/pasted-image-20260727204548.png)

如果出现大量红色 error，立刻停止把日志发给 AI。注意，一次不成功也是正常的。按 AI 的答复继续。

# 第五步：愉快玩耍

> 编译产物统一输出目录：E:\llamacpp-test\llama-cpp-turboquant\build\bin\Release\

## 5.1 验证 turboquant 主程序

```powershell
cd bin\Release
```

```powershell
.\llama-quantize.exe -h
```

如果 llama-quantize.exe 正常运行，帮助文本完整输出如图：

![量化工具帮助输出](/images/tutorials/pasted-image-20260727210945.png)

## 5.2 下载模型

国内：

- https://www.modelscope.cn/organization/unsloth?tab=model

国际：

- https://huggingface.co/huihui-ai/models

寻找适合的 GGUF 模型，模型大小选择为“总显存 - 7G”。

小模型推荐：

- unsloth/Qwen3.5-4B
- huihui-ai/Huihui-gemma-4-E2B-it-qat-q4_0-unquantized-abliterated-GGUF

## 5.3 启动模型测试

在 E:\llamacpp-test\llama-cpp-turboquant\build 目录下，用记事本把下面参数粘贴并保存为 .bat 文件：

```bat
"E:\llamacpp-test\llama-cpp-turboquant\build\llama-server.exe" ^
-m "E:/llama-models/models/gemma-4-E4B-it-IQ4_XS.gguf" ^
 --mmproj "E:\llamacpp-models\mmproj-Huihui-gemma-4-E4B-bf16.gguf" ^
-c 16384 ^
-ngl -1 ^
-t 5 ^
--flash-attn 1 ^
--reasoning off ^
--jinja ^
--host 192.168.101.136 ^
--port 13631
pause
```

不要完全照搬，不同模型、不同硬件、不同需求参数都不一样。

下面是逐行解释：

1. `llama-server.exe` 是 llama.cpp 的内置 HTTP API 服务端。
2. `-m` 指定加载的主 LLM 模型。
3. `--mmproj` 是多模态投影模块文件；如果只是纯文本对话，可以删掉这一行。
4. `-c` 是上下文窗口大小。
5. `-ngl -1` 表示把所有层下发到 GPU。
6. `-t` 是线程数量。
7. `--flash-attn 1` 开启 Flash Attention。
8. `--reasoning off` 关闭模型内置推理优化分支。
9. `--jinja` 强制启用 Jinja2 Chat Template。
10. `--host` 绑定监听 IP。
11. `--port` 服务监听端口。
12. `pause` 是 CMD 命令，用来防止窗口一闪而过。

![启动脚本示意](/images/tutorials/pasted-image-20260727223831.png)

启动脚本后，Ctrl + 鼠标左键点击你参数里的访问地址，就可以愉快使用本地大模型进行一场深刻的哲学探讨了。

![访问地址示意](/images/tutorials/pasted-image-20260727224026.png)
