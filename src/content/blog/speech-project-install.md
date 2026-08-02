---
title: 'Speech 项目安装（集成 TTS 和 STT）'
description: '按原始教程整理的语音项目安装、CUDA 配置与启动流程。'
pubDate: '2026-08-01'
updatedDate: '2026-08-01'
heroImage: '../../assets/cover-qima2.jpg'
---

> 前言：环境准备 FFmpeg、CUDA（都需要添加到 PATH）。

![环境准备说明](/images/tutorials/pasted-image-20260727232450.png)

确保环境可用：

![环境检查说明](/images/tutorials/pasted-image-20260727233121.png)

# 1、准备一个英文名字的新文件夹，打开 PowerShell，cd 进去

```powershell
python -m venv venv-speech-test
```

# 2、激活环境

```powershell
.\venv-speech-test\Scripts\Activate.ps1
```

# 3、下载

```powershell
pip install speech-to-speech
```

# 4、执行这条命令，确认模块可加载

```powershell
python -c "import speech_to_speech; print('导入成功，版本：', speech_to_speech.__version__)"
```

# 5、验证 CUDA 显卡加速

```powershell
python -c "import torch; print('Torch CUDA可用：', torch.cuda.is_available()); print('GPU型号：', torch.cuda.get_device_name(0))"
```

# 6、如果上一步出现错误，就是 Python 版本没有对应轮子

先查看 Python 版本和 CUDA 版本：

```powershell
python --version
nvidia-smi
```

![PyTorch 版本检查](/images/tutorials/pasted-image-20260728001133.png)

找到后记得：

1. 先彻底卸载 CPU 版 torch 三件套

```powershell
pip uninstall torch torchvision torchaudio -y
```

2. 清理 pip 缓存，防止它偷懒用旧包

```powershell
pip cache purge
```

3. 从 PyTorch 官方 nightly 索引强制安装 CUDA 13.0 版

```powershell
pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu130
```

# 7、安装完成后验证 GPU

```powershell
python -c "import torch; print('CUDA可用:', torch.cuda.is_available()); print('内置CUDA版本:', torch.version.cuda); print('显卡:', torch.cuda.get_device_name(0))"
```

确保出现：

![GPU 验证结果](/images/tutorials/pasted-image-20260728005121.png)

## 8、验证项目完整导入

```powershell
python -c "import speech_to_speech, torchaudio; print('全部模块加载正常')"
```

## 9、启动语音互转网页界面

> qwentts-cpp-python 在 Python 3.14 Windows 下没有找到预编译包，群主用的正是这个，不想从头编译了。要么忍痛强制切回原生 CUDA 后端，要么换其他 TTS。推荐 Kokoro（轻量、中文支持好）。

Kokoro 方案：

```powershell
pip install "speech-to-speech[kokoro]"
```

然后 `--tts kokoro` 运行。

如果不是 Python 3.14 的水友们可以继续用 qwen3，同时 `--model_name` 记得修改成你真实的模型地址，`--responses_api_base_url` 也改为你实际 llama.cpp 的地址。

启动命令：

```powershell
speech-to-speech `
  --mode realtime `
  --stt whisper `
  --stt_model_name "openai/whisper-large-v3" `
  --language zh `
  --llm_backend responses-api `
  --tts qwen3 `
  --qwen3_tts_language zh `
  --qwen3_tts_backend torch `
  --init_chat_prompt "所有对话仅使用中文，不要输出任何英文内容，等待用户完整说完再作答" `
  --model_name "E:/llama-models/models/gemma-4-E4B-it-IQ4_XS.gguf" `
  --responses_api_base_url "http://192.168.101.136:13631/v1" `
  --responses_api_api_key "sk-1234567890" `
  --responses_api_stream `
  --enable_live_transcription False `
  --min_silence_ms 1800 `
  --thresh 0.7
```

如图：

![启动命令示意](/images/tutorials/pasted-image-20260728015825.png)

## 10、另开一个新的 PowerShell 窗口依次执行

```powershell
cd E:\llamacpp-test\speech-test\venv-speech-test
git clone https://huggingface.co/spaces/smolagents/hf-realtime-voice
```

![克隆前端项目](/images/tutorials/pasted-image-20260728021223.png)

```powershell
cd hf-realtime-voice
python -m venv venv-speech-test2
.\venv-speech-test2\Scripts\Activate.ps1
```

![创建第二个虚拟环境](/images/tutorials/pasted-image-20260728021437.png)

```powershell
pip install -r requirements.txt
```

![安装前端依赖](/images/tutorials/pasted-image-20260728021651.png)

```powershell
uvicorn server:app --port 7860
```

![启动前端服务](/images/tutorials/pasted-image-20260728022439.png)

开聊：

![对话界面示意](/images/tutorials/pasted-image-20260728024414.png)

## 附录 1：下次启动顺序

1. 先打开你之前 llama.cpp 的 `.bat` 启动文件。
2. 打开第一个 PowerShell，启动第一个虚拟环境。

```powershell
cd E:\llamacpp-test\speech-test
.\venv-speech-test\Scripts\Activate.ps1
$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"
```

接着启动 speech-to-speech。

3. 打开第二个 PowerShell，启动第二个虚拟环境。

```powershell
cd E:\llamacpp-test\speech-test\venv-speech-test\hf-realtime-voice
.\venv-speech-test2\Scripts\Activate.ps1
uvicorn server:app --port 7860
```

## 附录 2：修改源码长期离线解决方案（非必须）

请参考原始教程中的源码修改方式，设置离线环境变量后再启动。
