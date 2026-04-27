<template>
  <div class="refactor-container">
    <el-alert
      title="✨ GenAI 智能代码重构舱 (带 Code Review 功能)"
      type="success"
      :closable="false"
      class="info-alert"
    >
      <template #default>
        <p>将存在坏味道的代码粘贴至左侧，AI 将自动应用 SOLID 原则为您生成重构方案。重构完成后，可切换至 <b>Diff 差异对比模式</b>，像 GitHub 一样审查 AI 的每一次修改。</p>
      </template>
    </el-alert>

    <el-card shadow="hover" class="main-card">
      <template #header>
        <div class="card-header">
          <span>AI 结对编程工作台</span>
          <div class="header-tools">
            <el-switch
              v-model="showDiff"
              active-text="Diff 差异对比"
              inactive-text="双屏编辑"
              active-color="#13ce66"
              style="margin-right: 20px;"
              :disabled="!newCode"
            />
            
            <el-select v-model="issueType" size="small" style="width: 150px; margin-right: 10px;">
              <el-option label="降低圈复杂度" value="圈复杂度过高" />
              <el-option label="拆分上帝类" value="上帝类职责过多" />
              <el-option label="消除魔法数字" value="代码规范与魔法数字" />
              <el-option label="DRY 提取公共方法" value="代码重复率高" />
            </el-select>
            <el-button type="primary" @click="startAiRefactoring" :loading="loading" color="#67C23A" style="color: white; font-weight: bold;">
              <el-icon><MagicStick /></el-icon> 召唤 AI 一键重构
            </el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="20" v-if="!showDiff">
        <el-col :span="12">
          <div class="code-panel">
            <div class="panel-title warning-title">
              <el-icon><Warning /></el-icon> 原始代码 (存在技术债务)
            </div>
            <el-input
              v-model="oldCode"
              type="textarea"
              :rows="22"
              placeholder="请将存在代码坏味道的 Java 代码粘贴到这里..."
              class="code-textarea"
            />
          </div>
        </el-col>

        <el-col :span="12">
          <div class="code-panel">
            <div class="panel-title success-title">
              <el-icon><Check /></el-icon> AI 重构结果 (符合规范)
              <el-button v-if="newCode" size="small" type="primary" link @click="copyCode" style="float: right;">
                <el-icon><CopyDocument /></el-icon> 复制
              </el-button>
            </div>
            <div v-if="loading" class="ai-loading">
              <div class="scanner"></div>
              <p>AI 架构师正在重新设计代码结构...</p>
            </div>
            <el-input
              v-else
              v-model="newCode"
              type="textarea"
              :rows="22"
              readonly
              placeholder="点击上方按钮，等待 AI 魔法降临..."
              class="code-textarea result-textarea"
            />
          </div>
        </el-col>
      </el-row>

      <div v-else class="diff-panel">
        <div class="diff-header">
          <span class="diff-del">- 删除了冗余/糟糕的代码</span>
          <span class="diff-add">+ 新增了优雅/优化的代码</span>
        </div>
        <Diff
          mode="split"
          theme="light"
          language="plaintext"
          :prev="oldCode"
          :current="newCode"
        />

        <div class="metrics-impact-panel" v-if="newMetrics.wmc">
          <div class="panel-header">
            <el-icon><DataLine /></el-icon> AI 重构效果量化评估 (AST 动态计算)
          </div>
          <el-row :gutter="20" class="impact-row">
            
            <el-col :span="6">
              <div class="metric-box">
                <div class="metric-title">圈复杂度 (WMC)</div>
                <div :class="['metric-value', newMetrics.wmc < oldMetrics.wmc ? 'success' : 'warning']">
                  {{ newMetrics.wmc }} 
                  <span class="trend">
                    {{ newMetrics.wmc <= oldMetrics.wmc ? '↓' : '↑' }} 较原代码 {{ oldMetrics.wmc }}
                  </span>
                </div>
                <div class="metric-desc">逻辑嵌套分支数量</div>
              </div>
            </el-col>
            
            <el-col :span="6">
              <div class="metric-box">
                <div class="metric-title">类间耦合度 (CBO)</div>
                <div :class="['metric-value', newMetrics.cbo < oldMetrics.cbo ? 'success' : 'warning']">
                  {{ newMetrics.cbo }} 
                  <span class="trend">
                    {{ newMetrics.cbo <= oldMetrics.cbo ? '↓' : '↑' }} 较原代码 {{ oldMetrics.cbo }}
                  </span>
                </div>
                <div class="metric-desc">引用外部类的数量</div>
              </div>
            </el-col>
            
            <el-col :span="6">
              <div class="metric-box">
                <div class="metric-title">代码总行数 (LOC)</div>
                <div class="metric-value" style="color: #409EFF;">
                  {{ newMetrics.loc }} 
                  <span class="trend">
                     {{ newMetrics.loc <= oldMetrics.loc ? '↓' : '↑' }} 较原代码 {{ oldMetrics.loc }}
                  </span>
                </div>
                <div class="metric-desc">物理代码行数</div>
              </div>
            </el-col>
            
            <el-col :span="6">
              <div class="metric-box">
                <div class="metric-title">技术债务状态</div>
                <div class="metric-value success">
                  已改善 <span class="trend"><el-icon><CircleCheckFilled /></el-icon></span>
                </div>
                <div class="metric-desc">由底层语法树 (AST) 实时分析</div>
              </div>
            </el-col>

          </el-row>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { MagicStick, Warning, Check, CopyDocument, DataLine, CircleCheckFilled } from '@element-plus/icons-vue';
import axios from 'axios';

const oldCode = ref('');
const newCode = ref('');
const issueType = ref('圈复杂度过高');
const loading = ref(false);
const showDiff = ref(false); // 控制是否显示 Diff 视图的开关
// 在旧的变量下面新增
const oldMetrics = ref({});
const newMetrics = ref({});

const startAiRefactoring = async () => {
  if (!oldCode.value.trim()) {
    ElMessage.warning('请先在左侧输入需要重构的代码！');
    return;
  }

  loading.value = true;
  newCode.value = '';
  showDiff.value = false; // 重构时自动切回双屏模式

  try {
    const res = await axios.post('http://localhost:8080/api/ai/refactor', {
      code: oldCode.value,
      issueType: issueType.value
    });

    if (res.data.code === 200) {
      // 接收真实数据
      newCode.value = res.data.data.codeStr;
      oldMetrics.value = res.data.data.oldMetrics;
      newMetrics.value = res.data.data.newMetrics;
      ElMessage.success('✨ 重构完成，您可以点击上方开关查看 Diff 差异！');
    } else {
      ElMessage.error(res.data.message || '重构失败');
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('无法连接到 AI 引擎，请检查后端服务。');
  } finally {
    loading.value = false;
  }
};

const copyCode = () => {
  navigator.clipboard.writeText(newCode.value);
  ElMessage.success('重构代码已复制到剪贴板！');
};
</script>

<style scoped>
.refactor-container { padding: 4px; }
.info-alert { margin-bottom: 20px; border-radius: 8px; }
.main-card { border-radius: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; font-weight: bold;}
.header-tools { display: flex; align-items: center; }

.code-panel { border: 1px solid #EBEEF5; border-radius: 8px; overflow: hidden; }
.panel-title { padding: 12px 16px; font-weight: bold; font-size: 14px; background-color: #f8f9fa; border-bottom: 1px solid #EBEEF5; }
.warning-title { color: #E6A23C; }
.success-title { color: #67C23A; }

:deep(.code-textarea .el-textarea__inner) {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  background-color: #fafafa;
  border: none;
  resize: none;
}
:deep(.result-textarea .el-textarea__inner) {
  background-color: #f0f9eb;
  color: #2b4b1b;
}

.ai-loading {
  height: 460px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
  color: #409eff;
  font-weight: bold;
}
.scanner {
  width: 100px;
  height: 4px;
  background-color: #67C23A;
  box-shadow: 0 0 10px #67C23A;
  animation: scan 1.5s infinite ease-in-out alternate;
  margin-bottom: 20px;
}
@keyframes scan {
  0% { transform: translateY(-30px); opacity: 0.2; }
  100% { transform: translateY(30px); opacity: 1; }
}

/* Diff 视图相关样式 */
.diff-panel {
  border: 1px solid #EBEEF5;
  border-radius: 8px;
  overflow: hidden;
}
.diff-header {
  padding: 10px 16px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #EBEEF5;
  display: flex;
  gap: 20px;
  font-size: 13px;
  font-weight: bold;
}
.diff-del { color: #d73a49; } /* GitHub 红色 */
.diff-add { color: #28a745; } /* GitHub 绿色 */
/* 重构效果评估面板样式 */
.metrics-impact-panel {
  margin-top: 20px;
  background-color: #ffffff;
  border: 1px solid #EBEEF5;
  border-radius: 8px;
  overflow: hidden;
}
.panel-header {
  padding: 12px 16px;
  background-color: #f5f7fa;
  font-weight: bold;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #EBEEF5;
}
.impact-row {
  padding: 20px;
}
.metric-box {
  text-align: center;
  padding: 15px;
  background: #fafafa;
  border-radius: 6px;
  transition: all 0.3s;
}
.metric-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}
.metric-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}
.metric-value {
  font-size: 24px;
  font-weight: bold;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
}
.metric-value.success { color: #67C23A; }
.metric-value.warning { color: #E6A23C; }
.trend {
  font-size: 12px;
  font-weight: normal;
  opacity: 0.8;
}
.metric-desc {
  margin-top: 8px;
  font-size: 12px;
  color: #a8abb2;
}
</style>