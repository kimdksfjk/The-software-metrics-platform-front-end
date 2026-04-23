<template>
  <div class="use-case-container">
    <!-- 说明卡片 -->
    <el-alert title="用例图度量说明" type="warning" :closable="false" class="info-alert">
      <template #default>
        <p>用例图度量主要基于系统的角色、用例及其关联关系，对系统需求复杂度和工作量进行估算。上传用例图XML文件，系统会自动解析并进行用例点数计算。</p>
      </template>
    </el-alert>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="12">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">调整后用例点 (UCP)</div>
              <div class="stat-value">{{ ucp.toFixed(2) }}</div>
            </div>
            <div class="stat-icon orange-bg">
              <el-icon :size="28" color="#E6A23C">
                <DataAnalysis />
              </el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">预估工作量</div>
              <div class="stat-value">{{ estimatedEffort.toFixed(1) }} <span class="stat-unit">人月</span></div>
            </div>
            <div class="stat-icon red-bg">
              <el-icon :size="28" color="#F56C6C">
                <Timer />
              </el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 文件上传区域 - 改为拖拽上传 -->
    <el-card class="upload-card" shadow="hover" v-if="!analysisDone">
      <div class="upload-content">
        <el-empty description="上传用例图XML文件" :image-size="80">
          <template #image>
            <el-icon :size="60" color="#E6A23C">
              <Share />
            </el-icon>
          </template>
        </el-empty>

        <el-upload ref="uploadRef" drag :auto-upload="false" :on-change="onFileSelected" :file-list="fileList"
          action="#" accept=".xml" :limit="1" class="upload-area">
          <el-icon class="upload-icon">
            <Upload />
          </el-icon>
          <div class="upload-text">
            将XML文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="upload-tip">
              支持 .xml 格式的用例图文件
            </div>
          </template>
        </el-upload>

        <div class="upload-actions">
          <el-button @click="openHistory" :icon="Clock">历史记录</el-button>
          <el-button v-if="fileList.length" @click="clearFile">清除</el-button>
          <el-button v-if="fileList.length" type="warning" @click="handleAnalyze" :loading="loading">
            开始分析
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 分析完成后的内容 -->
    <div v-else class="analysis-container">
      <!-- 结果头部 -->
      <div class="results-header">
        <div class="header-info">
          <h2>用例点分析结果</h2>
          <p>项目: {{ projectName || '未命名项目' }} | 文件: {{ fileName }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="openHistory" :icon="Clock">查看历史</el-button>
          <el-button type="primary" @click="saveToHistory" :icon="CircleCheck">保存记录</el-button>
          <el-button @click="clearResults" :icon="ArrowLeft">返回上传</el-button>
          <el-button type="warning" @click="exportResult" :icon="Download">导出结果</el-button>
        </div>
      </div>

      <el-card class="main-card" shadow="hover">
        <!-- 角色类型选择 -->
        <el-divider content-position="left">
          <span class="step-title">1. 角色类型选择</span>
        </el-divider>

        <el-row :gutter="16">
          <el-col :span="8" v-for="(actor, idx) in actors" :key="`actor-${idx}`">
            <div class="item-card">
              <div class="item-name">{{ actor }}</div>
              <el-select v-model="actorTypes[idx]" size="small" style="width: 120px">
                <el-option :value="1" label="简单(1)" />
                <el-option :value="2" label="普通(2)" />
                <el-option :value="3" label="复杂(3)" />
              </el-select>
            </div>
          </el-col>
        </el-row>

        <div class="calc-result">
          <span>UAW (角色总权重):</span>
          <strong>{{ uaw }}</strong>
        </div>

        <!-- 用例类型选择 -->
        <el-divider content-position="left">
          <span class="step-title">2. 用例类型选择</span>
        </el-divider>

        <el-row :gutter="16">
          <el-col :span="8" v-for="(usecase, idx) in usecases" :key="`usecase-${idx}`">
            <div class="item-card">
              <div class="item-name">{{ usecase }}</div>
              <el-select v-model="usecaseTypes[idx]" size="small" style="width: 120px">
                <el-option :value="5" label="简单(5)" />
                <el-option :value="10" label="普通(10)" />
                <el-option :value="15" label="复杂(15)" />
              </el-select>
            </div>
          </el-col>
        </el-row>

        <div class="calc-result">
          <span>UUC (用例总权重):</span>
          <strong>{{ uuc }}</strong>
        </div>

        <!-- 未调整用例点 -->
        <el-divider content-position="left">
          <span class="step-title">3. 未调整用例点 (UUCP)</span>
        </el-divider>

        <div class="calc-result highlight">
          <span>UUCP = UAW + UUC =</span>
          <strong>{{ uucp }}</strong>
        </div>

        <!-- 技术复杂因子 -->
        <el-divider content-position="left">
          <span class="step-title">4. 技术复杂因子 (TCF)</span>
        </el-divider>

        <el-row :gutter="12">
          <el-col :span="8" v-for="(item, idx) in techFactors" :key="`tf-${idx}`">
            <div class="factor-item">
              <span class="factor-label">{{ item.label }}</span>
              <el-slider v-model="item.selected" :min="0" :max="5" size="small" />
            </div>
          </el-col>
        </el-row>

        <div class="calc-result">
          <span>TCF = 0.6 + 0.01 × Σ(分值×权重) =</span>
          <strong>{{ tcf.toFixed(3) }}</strong>
        </div>

        <!-- 环境复杂因子 -->
        <el-divider content-position="left">
          <span class="step-title">5. 环境复杂因子 (EF)</span>
        </el-divider>

        <el-row :gutter="12">
          <el-col :span="8" v-for="(item, idx) in envFactors" :key="`ef-${idx}`">
            <div class="factor-item">
              <span class="factor-label">{{ item.label }}</span>
              <el-slider v-model="item.selected" :min="0" :max="5" size="small" />
            </div>
          </el-col>
        </el-row>

        <div class="calc-result">
          <span>EF = 1.4 + (-0.03) × Σ(分值×权重) =</span>
          <strong>{{ ef.toFixed(3) }}</strong>
        </div>

        <!-- 调整后用例点 -->
        <el-divider content-position="left">
          <span class="step-title">6. 调整后用例点 (UCP)</span>
        </el-divider>

        <div class="final-result">
          <span>UCP = UUCP × TCF × EF =</span>
          <strong class="ucp-value">{{ ucp.toFixed(2) }}</strong>
        </div>

        <!-- 工作量估算 -->
        <el-divider content-position="left">
          <span class="step-title">7. 工作量估算</span>
        </el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <div class="effort-input">
              <span>完成一个用例所需人时</span>
              <el-input-number v-model="humanHour" :min="0" :step="1" size="small" />
              <span>人时</span>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="effort-input">
              <span>一个人月对应人时</span>
              <el-input-number v-model="monthHour" :min="1" :step="8" size="small" />
              <span>人时</span>
            </div>
          </el-col>
        </el-row>

        <div class="calc-result final-effort">
          <span>预计工作量:</span>
          <strong>{{ estimatedEffort.toFixed(1) }} 人月</strong>
        </div>
      </el-card>
    </div>

    <!-- 加载中 -->
    <el-dialog v-model="loading" title="分析中" :close-on-click-modal="false" :show-close="false" width="400px" center>
      <div class="loading-content">
        <el-icon class="is-loading" :size="48" color="#E6A23C">
          <Loading />
        </el-icon>
        <p>正在分析用例图，请稍候...</p>
      </div>
    </el-dialog>

    <!-- 历史记录弹窗 -->
    <HistoryDialog ref="historyDialogRef" metric-type="UCP" @select="loadHistoryData" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload, Share, DataAnalysis, Timer, Loading, ArrowLeft, Download, Clock, CircleCheck } from '@element-plus/icons-vue';
import axios from 'axios';
import { historyApi } from '../../api/history';
import HistoryDialog from '../history/HistoryDialog.vue';

// 文件相关
const projectName = ref('');
const uploadRef = ref(null);
const fileContent = ref('');
const fileList = ref([]);
const fileName = ref('');
const analysisDone = ref(false);
const loading = ref(false);

// 后端返回数据
const actors = ref([]);
const usecases = ref([]);

// 角色/用例复杂度设置
const actorTypes = ref([]);
const usecaseTypes = ref([]);

// 技术复杂因子
const techFactors = ref([
  { label: '分布式系统', weight: 2, selected: 0 },
  { label: '响应或吞吐量性能', weight: 1, selected: 0 },
  { label: '终端用户效率', weight: 1, selected: 0 },
  { label: '复杂的内部处理', weight: 1, selected: 0 },
  { label: '代码必须重用', weight: 1, selected: 0 },
  { label: '易安装性', weight: 0.5, selected: 0 },
  { label: '易用性', weight: 0.5, selected: 0 },
  { label: '可移植性', weight: 2, selected: 0 },
  { label: '易更改性', weight: 1, selected: 0 },
  { label: '并发性', weight: 1, selected: 0 },
  { label: '特殊的安全性', weight: 1, selected: 0 },
  { label: '提供第三方接口', weight: 1, selected: 0 },
  { label: '需要特别的用户培训', weight: 1, selected: 0 }
]);

// 环境复杂因子
const envFactors = ref([
  { label: '熟悉UML程度', weight: 1.5, selected: 0 },
  { label: '应用程序开发经验', weight: 0.5, selected: 0 },
  { label: '面向对象的经验', weight: 1, selected: 0 },
  { label: '主分析师能力', weight: 0.5, selected: 0 },
  { label: '激励机制', weight: 1, selected: 0 },
  { label: '需求稳定度', weight: 2, selected: 0 },
  { label: '具有兼职人员', weight: -1, selected: 0 },
  { label: '具有复杂编程', weight: -1, selected: 0 }
]);

// 工作量参数
const humanHour = ref(28);
const monthHour = ref(167);

// 计算属性
const uaw = computed(() => actorTypes.value.reduce((a, v) => a + v, 0));
const uuc = computed(() => usecaseTypes.value.reduce((a, v) => a + v, 0));
const uucp = computed(() => uaw.value + uuc.value);

const tcf = computed(() => {
  let sum = 0;
  for (const item of techFactors.value) sum += item.selected * item.weight;
  return 0.6 + 0.01 * sum;
});

const ef = computed(() => {
  let sum = 0;
  for (const item of envFactors.value) sum += item.selected * item.weight;
  return 1.4 + (-0.03) * sum;
});

const ucp = computed(() => uucp.value * tcf.value * ef.value);

const estimatedEffort = computed(() => {
  return (ucp.value * humanHour.value) / monthHour.value;
});

// 文件选择
const onFileSelected = (file) => {
  if (!file.raw.name.endsWith('.xml')) {
    ElMessage.warning('请上传 .xml 文件');
    return false;
  }
  fileList.value = [file];
  fileName.value = file.raw.name;
  const reader = new FileReader();
  reader.onload = (ev) => {
    fileContent.value = ev.target.result;
  };
  reader.readAsText(file.raw, 'utf-8');
  return false;
};

const clearFile = () => {
  fileList.value = [];
  fileContent.value = '';
  fileName.value = '';
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
};

const clearResults = () => {
  analysisDone.value = false;
  clearFile();
  actors.value = [];
  usecases.value = [];
  actorTypes.value = [];
  usecaseTypes.value = [];
  // 重置因子
  techFactors.value.forEach(f => f.selected = 0);
  envFactors.value.forEach(f => f.selected = 0);
};

// 导出结果
const exportResult = () => {
  const exportData = {
    fileName: fileName.value,
    uaw: uaw.value,
    uuc: uuc.value,
    uucp: uucp.value,
    tcf: tcf.value,
    ef: ef.value,
    ucp: ucp.value,
    estimatedEffort: estimatedEffort.value,
    actors: actors.value,
    usecases: usecases.value
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ucp-metrics-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  ElMessage.success('导出成功');
};

// 分析
const handleAnalyze = async () => {
  if (!fileContent.value) {
    ElMessage.warning('请先选择文件');
    return;
  }

  loading.value = true;

  try {
    const res = await axios.post('http://127.0.0.1:8080/UCPMetrics', fileContent.value, {
      headers: { 'Content-Type': 'application/xml' }
    });

    actors.value = res.data.actors || [];
    usecases.value = res.data.usecases || [];

    actorTypes.value = actors.value.map(() => 1);
    usecaseTypes.value = usecases.value.map(() => 5);

    analysisDone.value = true;
    ElMessage.success('分析完成');
  } catch (err) {
    console.error(err);
    ElMessage.error(`分析失败: ${err.message}`);
  } finally {
    loading.value = false;
  }
};

// 历史记录相关
const historyDialogRef = ref(null);
const openHistory = () => {
  historyDialogRef.value.open();
};

const saveToHistory = async () => {
  if (!analysisDone.value) {
    ElMessage.warning('没有可保存的数据');
    return;
  }

  if (!projectName.value) {
    try {
      const { value } = await ElMessageBox.prompt('请输入项目名称', '保存历史记录', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /\S+/,
        inputErrorMessage: '项目名称不能为空'
      });
      projectName.value = value;
    } catch (error) {
      return;
    }
  }

  const exportData = {
    fileName: fileName.value,
    uaw: uaw.value,
    uuc: uuc.value,
    uucp: uucp.value,
    tcf: tcf.value,
    ef: ef.value,
    ucp: ucp.value,
    estimatedEffort: estimatedEffort.value,
    actors: actors.value,
    usecases: usecases.value,
    actorTypes: actorTypes.value,
    usecaseTypes: usecaseTypes.value,
    techFactors: techFactors.value,
    envFactors: envFactors.value,
    humanHour: humanHour.value,
    monthHour: monthHour.value
  };

  try {
    const response = await historyApi.saveHistory({
      projectName: projectName.value,
      metricType: 'UCP',
      data: { results: [exportData] }
    });
    if (response.data.success) {
      ElMessage.success('历史记录保存成功');
    }
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存历史记录失败');
  }
};

const loadHistoryData = (historyData) => {
  if (historyData && historyData.results && historyData.results.length > 0) {
    const data = historyData.results[0];
    fileName.value = data.fileName;
    actors.value = data.actors;
    usecases.value = data.usecases;
    actorTypes.value = data.actorTypes || data.actors.map(() => 1);
    usecaseTypes.value = data.usecaseTypes || data.usecases.map(() => 5);

    if (data.techFactors) techFactors.value = data.techFactors;
    if (data.envFactors) envFactors.value = data.envFactors;
    if (data.humanHour) humanHour.value = data.humanHour;
    if (data.monthHour) monthHour.value = data.monthHour;

    analysisDone.value = true;
  }
};
</script>

<style scoped>
.use-case-container {
  padding: 4px;
}

.info-alert {
  margin-bottom: 20px;
  border-radius: 8px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 12px;
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
}

.stat-unit {
  font-size: 14px;
  font-weight: normal;
  color: #909399;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
}

.orange-bg {
  background-color: #FDF6EC;
}

.red-bg {
  background-color: #FEF0F0;
}

.upload-card {
  border-radius: 12px;
}

.upload-content {
  padding: 20px;
}

.upload-area {
  margin: 20px 0;
}

.upload-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}

.analysis-container {
  animation: fadeIn 0.3s ease;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #E6A23C 0%, #F56C6C 100%);
  border-radius: 12px;
  color: white;
}

.header-info h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
}

.header-info p {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.main-card {
  border-radius: 12px;
}

.step-title {
  font-size: 16px;
  font-weight: 600;
  color: #E6A23C;
}

.item-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 12px;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.calc-result {
  text-align: right;
  padding: 12px 16px;
  background-color: #FDF6EC;
  border-radius: 8px;
  margin: 16px 0;
}

.calc-result span {
  font-size: 14px;
  color: #606266;
  margin-right: 12px;
}

.calc-result strong {
  font-size: 18px;
  color: #E6A23C;
}

.calc-result.highlight {
  background-color: #FFF7E6;
}

.calc-result.highlight strong {
  font-size: 24px;
}

.factor-item {
  margin-bottom: 12px;
}

.factor-label {
  font-size: 12px;
  color: #606266;
  display: block;
  margin-bottom: 8px;
}

.final-result {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #E6A23C 0%, #F56C6C 100%);
  border-radius: 12px;
  margin: 16px 0;
}

.final-result span {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  margin-right: 16px;
}

.ucp-value {
  font-size: 32px;
  font-weight: 700;
  color: white;
}

.effort-input {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.effort-input span {
  font-size: 13px;
  color: #606266;
}

.final-effort {
  background-color: #FDF6EC;
}

.final-effort strong {
  color: #E6A23C;
}

.loading-content {
  text-align: center;
  padding: 20px;
}

.loading-content p {
  margin-top: 16px;
  color: #606266;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>