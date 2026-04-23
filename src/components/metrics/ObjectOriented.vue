<template>
  <div class="ck-container">
    <!-- 说明卡片 -->
    <el-alert title="面向对象度量说明 (CK 指标集)" type="success" :closable="false" class="info-alert">
      <template #default>
        <p>CK 指标集是一组用于评估面向对象设计质量的度量指标，包括 WMC、RFC、DIT、NOC、CBO 和 LCOM 等。上传类图或源代码 XML 文件，系统将自动分析相关指标。</p>
      </template>
    </el-alert>

    <!-- 文件上传区域 -->
    <el-card class="upload-card" shadow="hover" v-if="!ckData.length">
      <div class="upload-content">
        <el-empty description="选择包含类信息的 XML 文件进行 CK 指标分析" :image-size="80">
          <template #image>
            <el-icon :size="60" color="#67C23A">
              <Grid />
            </el-icon>
          </template>
        </el-empty>

        <div class="upload-area">
          <el-upload ref="uploadRef" drag :auto-upload="false" :on-change="onFileSelected" :file-list="fileList"
            accept=".xml" :limit="1">
            <el-icon class="upload-icon">
              <Upload />
            </el-icon>
            <div class="upload-text">将 XML 文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="upload-tip">支持 .xml 格式的类图文件</div>
            </template>
          </el-upload>
        </div>

        <div class="upload-actions" v-if="fileList.length">
          <el-button @click="clearFile">清除</el-button>
          <el-button type="success" @click="analyzeFile" :loading="loading">
            开始分析
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 分析结果 -->
    <div v-if="ckData.length" class="results-container">
      <!-- 结果头部 -->
      <div class="results-header">
        <div class="header-info">
          <h2>CK 指标分析报告</h2>
          <p>分析了 {{ ckData.length }} 个类</p>
        </div>
        <div class="header-actions">
          <el-button @click="clearResults" :icon="ArrowLeft">返回上传</el-button>
          <el-button type="success" @click="exportData" :icon="Download">导出数据</el-button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="4" v-for="metric in mainMetrics" :key="metric.key">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-info">
                <div class="stat-label">{{ metric.label }}</div>
                <div class="stat-value" :class="metric.color">
                  {{ calculateAverage(metric.key).toFixed(2) }}
                </div>
              </div>
              <div class="stat-icon" :class="metric.bgClass">
                <el-icon :size="24">
                  <component :is="metric.icon" />
                </el-icon>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 图表控制栏 -->
      <div class="chart-controls">
        <div class="control-group">
          <span class="control-label">图表类型:</span>
          <el-radio-group v-model="activeChartType" size="small">
            <el-radio-button value="bar">柱状图</el-radio-button>
            <el-radio-button value="line">折线图</el-radio-button>
            <el-radio-button value="radar">雷达图</el-radio-button>
          </el-radio-group>
        </div>

        <div class="control-group">
          <span class="control-label">显示指标:</span>
          <el-checkbox-group v-model="selectedMetrics" size="small">
            <el-checkbox value="wmc">WMC</el-checkbox>
            <el-checkbox value="cbo">CBO</el-checkbox>
            <el-checkbox value="lcom">LCOM</el-checkbox>
            <el-checkbox value="rfc">RFC</el-checkbox>
            <el-checkbox value="dit">DIT</el-checkbox>
          </el-checkbox-group>
        </div>
      </div>

      <!-- 图表区域 -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header><span>指标对比分析</span></template>
            <div ref="mainChartContainer" class="chart-container"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>质量分布</span>
                <el-select v-model="selectedClass" size="small" placeholder="选择类与平均值对比" clearable>
                  <el-option v-for="(item, idx) in ckData" :key="idx" :value="idx" :label="item.name" />
                </el-select>
              </div>
            </template>
            <div ref="radarChartContainer" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 质量评估 -->
      <el-card shadow="hover" class="assessment-card">
        <template #header><span>质量评估与改进建议</span></template>
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="assessment-item">
              <div class="assessment-title">质量分布</div>
              <div ref="qualityChartContainer" class="small-chart"></div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="assessment-item">
              <div class="assessment-title">潜在问题类排行</div>
              <div v-for="(item, idx) in getProblemClasses(5)" :key="idx" class="problem-item">
                <span class="problem-name">{{ item.name }}</span>
                <el-tag :type="getQualityTagType(item)" size="small">{{ getQualityAssessment(item) }}</el-tag>
              </div>
              <div v-if="getProblemClasses(5).length === 0" class="no-problem">未检测到明显问题</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="assessment-item">
              <div class="assessment-title">改进建议</div>
              <div v-if="getHighComplexityCount() > 0" class="suggestion-item warning">
                <el-icon>
                  <Warning />
                </el-icon>
                <span>有 {{ getHighComplexityCount() }} 个类的 WMC 指标过高，考虑拆分这些类</span>
              </div>
              <div v-if="getHighCouplingCount() > 0" class="suggestion-item warning">
                <el-icon>
                  <Warning />
                </el-icon>
                <span>有 {{ getHighCouplingCount() }} 个类的耦合度过高，考虑松耦合重构</span>
              </div>
              <div v-if="getHighLCOMCount() > 0" class="suggestion-item warning">
                <el-icon>
                  <Warning />
                </el-icon>
                <span>有 {{ getHighLCOMCount() }} 个类的内聚度过低，考虑提高内部凝聚力</span>
              </div>
              <div v-if="!(getHighComplexityCount() || getHighCouplingCount() || getHighLCOMCount())"
                class="suggestion-item success">
                <el-icon>
                  <CircleCheck />
                </el-icon>
                <span>整体代码质量良好，继续保持当前的编码实践</span>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 详细数据表格 -->
      <el-card shadow="hover" class="table-card">
        <template #header>
          <div class="table-header">
            <span>CK 度量结果详情</span>
            <div class="table-tools">
              <el-input v-model="tableFilter" placeholder="搜索类名..." :prefix-icon="Search" size="small"
                style="width: 200px" clearable />
              <el-select v-model="sortBy" size="small" style="width: 120px">
                <el-option value="name" label="类名" />
                <el-option value="wmc" label="WMC" />
                <el-option value="rfc" label="RFC" />
                <el-option value="cbo" label="CBO" />
              </el-select>
            </div>
          </div>
        </template>

        <el-table :data="filteredAndSortedData" stripe>
          <el-table-column prop="name" label="类名" min-width="150" />
          <el-table-column prop="wmc" label="WMC" width="80" sortable>
            <template #default="{ row }"><el-tag :type="getMetricTagType(row.wmc, 10)" size="small">{{ row.wmc
                }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="rfc" label="RFC" width="80" sortable>
            <template #default="{ row }"><el-tag :type="getMetricTagType(row.rfc, 20)" size="small">{{ row.rfc
                }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="dit" label="DIT" width="70" sortable />
          <el-table-column prop="noc" label="NOC" width="70" sortable />
          <el-table-column prop="cbo" label="CBO" width="80" sortable>
            <template #default="{ row }"><el-tag :type="getMetricTagType(row.cbo, 5)" size="small">{{ row.cbo
                }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="lcom" label="LCOM" width="80" sortable>
            <template #default="{ row }"><el-tag :type="getMetricTagType(row.lcom, 10)" size="small">{{ row.lcom
                }}</el-tag></template>
          </el-table-column>
          <el-table-column label="评估" width="100">
            <template #default="{ row }">
              <el-tag :type="getQualityTagType(row)" size="small">{{ getQualityAssessment(row) }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 加载中 -->
    <el-dialog v-model="loading" title="分析中" :close-on-click-modal="false" :show-close="false" width="400px" center>
      <div class="loading-content">
        <el-icon class="is-loading" :size="48" color="#67C23A">
          <Loading />
        </el-icon>
        <p>正在分析 CK 指标，请稍候...</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Upload, Grid, ArrowLeft, Download, Search, Loading, Warning, CircleCheck } from '@element-plus/icons-vue';
import Chart from 'chart.js/auto';
import axios from 'axios';

// 状态变量
const fileName = ref('');
const fileData = ref('');
const loading = ref(false);
const ckData = ref([]);
const fileList = ref([]);
const uploadRef = ref(null);

// 图表相关
const mainChartContainer = ref(null);
const radarChartContainer = ref(null);
const qualityChartContainer = ref(null);
let mainChart = null;
let radarChart = null;
let qualityChart = null;

// UI状态
const activeChartType = ref('bar');
const selectedMetrics = ref(['wmc', 'cbo', 'lcom']);
const selectedClass = ref('');
const tableFilter = ref('');
const sortBy = ref('name');

// 主指标配置
const mainMetrics = [
  { key: 'wmc', label: '平均复杂度', color: 'green-color', bgClass: 'green-bg', icon: 'Grid' },
  { key: 'cbo', label: '平均耦合度', color: 'red-color', bgClass: 'red-bg', icon: 'Share' },
  { key: 'lcom', label: '平均内聚缺失', color: 'gray-color', bgClass: 'gray-bg', icon: 'Document' },
  { key: 'rfc', label: '平均响应集', color: 'blue-color', bgClass: 'blue-bg', icon: 'Connection' },
  { key: 'dit', label: '平均继承深度', color: 'purple-color', bgClass: 'purple-bg', icon: 'Tree' }
];

// 图表颜色
const chartColors = {
  wmc: { bg: 'rgba(16, 185, 129, 0.6)', border: 'rgba(16, 185, 129, 1)' },
  cbo: { bg: 'rgba(239, 68, 68, 0.6)', border: 'rgba(239, 68, 68, 1)' },
  lcom: { bg: 'rgba(107, 114, 128, 0.6)', border: 'rgba(107, 114, 128, 1)' },
  rfc: { bg: 'rgba(59, 130, 246, 0.6)', border: 'rgba(59, 130, 246, 1)' },
  dit: { bg: 'rgba(139, 92, 246, 0.6)', border: 'rgba(139, 92, 246, 1)' }
};

// 文件处理
const onFileSelected = (file) => {
  if (!file.raw.name.endsWith('.xml')) {
    ElMessage.warning('请选择 .xml 文件');
    return;
  }
  fileList.value = [file];
  const reader = new FileReader();
  reader.readAsText(file.raw, "UTF-8");
  reader.onload = function (evt) {
    fileData.value = evt.target.result;
  };
};

const clearFile = () => {
  fileList.value = [];
  fileData.value = '';
};

const analyzeFile = async () => {
  if (!fileData.value) {
    ElMessage.warning('请先选择文件');
    return;
  }

  loading.value = true;

  try {
    const response = await axios({
      url: "http://127.0.0.1:8080/CKMetrics",
      method: 'post',
      data: fileData.value,
      headers: { 'Content-Type': 'application/xml' }
    });

    processResponse(response.data);
    ElMessage.success('分析完成');
  } catch (error) {
    console.error('Error:', error);
    ElMessage.error('分析过程中出错: ' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

const processResponse = (data) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(data, 'text/xml');
  const results = xmlDoc.getElementsByTagName('result');
  const parsedData = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    parsedData.push({
      name: getElementValue(result, 'name'),
      wmc: parseInt(getElementValue(result, 'wmc')),
      rfc: parseInt(getElementValue(result, 'rfc')),
      dit: parseInt(getElementValue(result, 'dit')),
      noc: parseInt(getElementValue(result, 'noc')),
      cbo: parseInt(getElementValue(result, 'cbo')),
      lcom: parseInt(getElementValue(result, 'lcom'))
    });
  }

  ckData.value = parsedData;

  setTimeout(() => {
    createMainChart();
    createRadarChart();
    createQualityChart();
  }, 100);
};

const getElementValue = (parent, tagName) => {
  const element = parent.getElementsByTagName(tagName)[0];
  return element ? element.textContent.trim() : '0';
};

// 计算函数
const calculateAverage = (metric) => {
  if (!ckData.value.length) return 0;
  return ckData.value.reduce((a, i) => a + i[metric], 0) / ckData.value.length;
};

const getQualityAssessment = (item) => {
  if (item.wmc > 10 || item.cbo > 5 || item.lcom > 10) return '需要重构';
  if (item.wmc > 5 || item.cbo > 3 || item.lcom > 5) return '一般';
  return '良好';
};

const getQualityTagType = (item) => {
  const assessment = getQualityAssessment(item);
  if (assessment === '需要重构') return 'danger';
  if (assessment === '一般') return 'warning';
  return 'success';
};

const getMetricTagType = (value, threshold) => {
  if (value >= threshold * 1.5) return 'danger';
  if (value >= threshold) return 'warning';
  return 'success';
};

const getProblemClasses = (limit) => {
  return [...ckData.value]
    .sort((a, b) => (b.wmc * 0.4 + b.cbo * 0.3 + b.lcom * 0.3) - (a.wmc * 0.4 + a.cbo * 0.3 + a.lcom * 0.3))
    .filter(i => getQualityAssessment(i) !== '良好')
    .slice(0, limit);
};

const getHighComplexityCount = () => ckData.value.filter(i => i.wmc > 10).length;
const getHighCouplingCount = () => ckData.value.filter(i => i.cbo > 5).length;
const getHighLCOMCount = () => ckData.value.filter(i => i.lcom > 10).length;

// 表格数据
const filteredAndSortedData = computed(() => {
  let result = [...ckData.value];
  if (tableFilter.value) {
    result = result.filter(i => i.name.toLowerCase().includes(tableFilter.value.toLowerCase()));
  }
  result.sort((a, b) => {
    if (sortBy.value === 'name') return a.name.localeCompare(b.name);
    return b[sortBy.value] - a[sortBy.value];
  });
  return result;
});

// 图表函数
const createMainChart = () => {
  if (mainChart) mainChart.destroy();
  if (!mainChartContainer.value || !ckData.value.length) return;

  const ctx = document.createElement('canvas');
  mainChartContainer.value.innerHTML = '';
  mainChartContainer.value.appendChild(ctx);

  const datasets = selectedMetrics.value.map(key => ({
    label: key.toUpperCase(),
    data: ckData.value.map(i => i[key]),
    backgroundColor: chartColors[key]?.bg || '#ccc',
    borderColor: chartColors[key]?.border || '#999',
    borderWidth: 1
  }));

  mainChart = new Chart(ctx, {
    type: activeChartType.value,
    data: { labels: ckData.value.map(i => i.name), datasets },
    options: { responsive: true, maintainAspectRatio: false }
  });
};

const createRadarChart = () => {
  if (radarChart) radarChart.destroy();
  if (!radarChartContainer.value || !ckData.value.length) return;

  const ctx = document.createElement('canvas');
  radarChartContainer.value.innerHTML = '';
  radarChartContainer.value.appendChild(ctx);

  const metrics = ['wmc', 'rfc', 'dit', 'noc', 'cbo', 'lcom'];
  const avgData = metrics.map(m => calculateAverage(m));
  const datasets = [{ label: '平均值', data: avgData, backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3B82F6' }];

  if (selectedClass.value !== '') {
    const classData = metrics.map(m => ckData.value[selectedClass.value][m]);
    datasets.push({ label: ckData.value[selectedClass.value].name, data: classData, backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' });
  }

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: { labels: metrics.map(m => m.toUpperCase()), datasets },
    options: { responsive: true, maintainAspectRatio: false }
  });
};

const createQualityChart = () => {
  if (qualityChart) qualityChart.destroy();
  if (!qualityChartContainer.value || !ckData.value.length) return;

  const ctx = document.createElement('canvas');
  qualityChartContainer.value.innerHTML = '';
  qualityChartContainer.value.appendChild(ctx);

  const counts = { '良好': 0, '一般': 0, '需要重构': 0 };
  ckData.value.forEach(i => counts[getQualityAssessment(i)]++);

  qualityChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: ['#67C23A', '#E6A23C', '#F56C6C'] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
};

const clearResults = () => {
  ckData.value = [];
  fileData.value = '';
  fileList.value = [];
  selectedClass.value = '';
  tableFilter.value = '';
  if (mainChart) mainChart.destroy();
  if (radarChart) radarChart.destroy();
  if (qualityChart) qualityChart.destroy();
};

const exportData = () => {
  if (!ckData.value.length) return;
  const blob = new Blob([JSON.stringify(ckData.value, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `ck-metrics-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  ElMessage.success('导出成功');
};

watch(activeChartType, () => ckData.value.length && createMainChart());
watch(selectedMetrics, () => ckData.value.length && createMainChart(), { deep: true });
watch(selectedClass, () => ckData.value.length && createRadarChart());

onUnmounted(() => {
  if (mainChart) mainChart.destroy();
  if (radarChart) radarChart.destroy();
  if (qualityChart) qualityChart.destroy();
});
</script>

<style scoped>
.ck-container {
  padding: 4px;
}

.info-alert {
  margin-bottom: 20px;
  border-radius: 8px;
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

.results-container {
  animation: fadeIn 0.3s ease;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #67C23A 0%, #409EFF 100%);
  border-radius: 12px;
  color: white;
}

.header-info h2 {
  margin: 0 0 4px;
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
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.green-color {
  color: #67C23A;
}

.red-color {
  color: #F56C6C;
}

.blue-color {
  color: #409EFF;
}

.purple-color {
  color: #9C27B0;
}

.gray-color {
  color: #909399;
}

.green-bg {
  background-color: #F0F9EB;
}

.red-bg {
  background-color: #FEF0F0;
}

.blue-bg {
  background-color: #ECF5FF;
}

.purple-bg {
  background-color: #F3E5F5;
}

.gray-bg {
  background-color: #F4F4F5;
}

.chart-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-label {
  font-size: 13px;
  color: #606266;
}

.chart-card {
  border-radius: 12px;
  margin-bottom: 20px;
}

.chart-container {
  height: 320px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.assessment-card {
  border-radius: 12px;
  margin-bottom: 20px;
}

.assessment-item {
  padding: 12px;
}

.assessment-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 12px;
}

.small-chart {
  height: 150px;
}

.problem-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #EBEEF5;
}

.problem-name {
  font-size: 13px;
  color: #606266;
}

.no-problem {
  text-align: center;
  padding: 20px;
  color: #67C23A;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.suggestion-item.warning {
  background-color: #FDF6EC;
  color: #E6A23C;
}

.suggestion-item.success {
  background-color: #F0F9EB;
  color: #67C23A;
}

.table-card {
  border-radius: 12px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-tools {
  display: flex;
  gap: 12px;
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