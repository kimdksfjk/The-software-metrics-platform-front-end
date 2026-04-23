<template>
  <div class="lk-container">
    <!-- 说明卡片 -->
    <el-alert title="面向对象度量说明 (LK 指标集)" type="info" :closable="false" class="info-alert">
      <template #default>
        <p>LK 指标集是由 M. Lorenz 和 J. Kidd 提出的面向对象度量方法，主要用于评估类的规模、继承行为以及特化程度，包括 CS、NOO、NOA、SI 等指标。</p>
      </template>
    </el-alert>

    <!-- 文件上传区域 -->
    <el-card class="upload-card" shadow="hover" v-if="!lkData.length">
      <div class="upload-content">
        <el-empty description="选择包含类信息的 XML 文件进行 LK 指标分析" :image-size="80">
          <template #image>
            <el-icon :size="60" color="#409EFF">
              <Share />
            </el-icon>
          </template>
        </el-empty>

        <div class="upload-area">
          <div class="project-name-input" style="margin-bottom: 20px;">
            <el-input v-model="projectName" placeholder="请输入项目名称 (必填)" clearable>
              <template #prepend>项目名称</template>
            </el-input>
          </div>
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

        <div class="upload-actions">
          <el-button @click="openHistory" :icon="Clock">历史记录</el-button>
          <el-button v-if="fileList.length" @click="clearFile">清除</el-button>
          <el-button v-if="fileList.length" type="primary" @click="analyzeFile" :loading="loading">
            开始分析
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 分析结果 -->
    <div v-if="lkData.length" class="results-container">
      <!-- 结果头部 -->
      <div class="results-header">
        <div class="header-info">
          <h2>LK 指标分析报告</h2>
          <p>项目: {{ projectName || '未命名项目' }} | 分析了 {{ lkData.length }} 个类，发现了 {{ getPotentialIssueCount() }} 个潜在问题</p>
        </div>
        <div class="header-actions">
          <el-button @click="openHistory" :icon="Clock">查看历史</el-button>
          <el-button @click="clearResults" :icon="ArrowLeft">返回上传</el-button>
          <el-button type="primary" @click="exportData" :icon="Download">导出数据</el-button>
        </div>
      </div>

      <!-- KPI 卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="4" v-for="kpi in kpiCards" :key="kpi.key">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-info">
                <div class="stat-label">{{ kpi.label }}</div>
                <div class="stat-value">{{ kpi.value }}</div>
              </div>
              <div class="stat-icon" :class="kpi.bgClass">
                <el-icon :size="24">
                  <component :is="kpi.icon" />
                </el-icon>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 指标解释卡片 -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="hover" class="explain-card">
            <template #header><span>LK 度量指标解释</span></template>
            <div class="explain-item blue">
              <div class="explain-title">类规模 (CS)</div>
              <p>包括方法总数和属性总数，衡量类的整体规模。高CS值可能表示类承担了过多职责。</p>
            </div>
            <div class="explain-item pink">
              <div class="explain-title">方法重写数量 (NOO)</div>
              <p>子类重写父类方法的数量。高NOO值可能表示父类抽象不足。</p>
            </div>
            <div class="explain-item orange">
              <div class="explain-title">新增方法数量 (NOA)</div>
              <p>子类在继承父类时新增的方法数量。高NOA值表示子类与父类差异大。</p>
            </div>
            <div class="explain-item red">
              <div class="explain-title">特化指数 (SI)</div>
              <p>SI = (NOO × L) ÷ M_total，L为继承层次，M_total为方法总数。高SI值表示类高度特化。</p>
            </div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card shadow="hover" class="issues-card">
            <template #header><span>潜在设计问题</span></template>
            <div v-for="(issue, idx) in getDesignIssues()" :key="idx" class="issue-item" :class="issue.type">
              <el-icon>
                <WarningFilled />
              </el-icon>
              <div>
                <div class="issue-class">{{ issue.className }}</div>
                <div class="issue-message">{{ issue.message }}</div>
              </div>
            </div>
            <div v-if="!getDesignIssues().length" class="no-issues">
              <el-icon>
                <CircleCheckFilled />
              </el-icon>
              <span>未检测到明显的设计问题，继续保持良好的设计实践！</span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 图表区域 -->
      <el-card shadow="hover" class="chart-card">
        <template #header>
          <div class="chart-header">
            <el-radio-group v-model="activeChart" size="small">
              <el-radio-button value="classSize">类规模分析</el-radio-button>
              <el-radio-button value="inheritance">继承行为分析</el-radio-button>
              <el-radio-button value="specialization">特化度分析</el-radio-button>
            </el-radio-group>
          </div>
        </template>
        <div ref="chartContainer" class="chart-container"></div>
      </el-card>

      <!-- 详细数据表格 -->
      <el-card shadow="hover" class="table-card">
        <template #header>
          <div class="table-header">
            <span>LK 度量结果详情</span>
            <div class="table-tools">
              <el-input v-model="tableFilter" placeholder="搜索类名..." :prefix-icon="Search" size="small"
                style="width: 200px" clearable />
            </div>
          </div>
        </template>

        <el-table :data="filteredData" stripe>
          <el-table-column prop="name" label="类名" min-width="150" />
          <el-table-column prop="totalNumberOfMethod" label="方法总数" width="100" sortable>
            <template #default="{ row }"><el-tag :type="getMetricTagType(row.totalNumberOfMethod, 15)" size="small">{{
              row.totalNumberOfMethod }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="totalNumberOfAttr" label="属性总数" width="100" sortable>
            <template #default="{ row }"><el-tag :type="getMetricTagType(row.totalNumberOfAttr, 15)" size="small">{{
              row.totalNumberOfAttr }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="noo" label="重写方法 (NOO)" width="120" sortable>
            <template #default="{ row }"><el-tag :type="getMetricTagType(row.noo, 5)" size="small">{{ row.noo
                }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="noa" label="新增方法 (NOA)" width="120" sortable>
            <template #default="{ row }"><el-tag :type="getMetricTagType(row.noa, 8)" size="small">{{ row.noa
                }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="si" label="特化指数 (SI)" width="120" sortable>
            <template #default="{ row }"><el-tag :type="getMetricTagType(row.si, 0.5, true)" size="small">{{
              row.si.toFixed(2) }}</el-tag></template>
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
        <el-icon class="is-loading" :size="48" color="#409EFF">
          <Loading />
        </el-icon>
        <p>正在分析 LK 指标，请稍候...</p>
      </div>
    </el-dialog>

    <!-- 历史记录弹窗 -->
    <HistoryDialog ref="historyDialogRef" metric-type="LK" @select="loadHistoryData" />
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload, Share, ArrowLeft, Download, Search, Loading, WarningFilled, CircleCheckFilled, Grid, Connection, Document, Clock, CircleCheck } from '@element-plus/icons-vue';
import Chart from 'chart.js/auto';
import axios from 'axios';
import { historyApi } from '../../api/history';
import HistoryDialog from '../history/HistoryDialog.vue';

// 状态变量
const projectName = ref('');
const fileName = ref('');
const fileData = ref('');
const loading = ref(false);
const lkData = ref([]);
const fileList = ref([]);
const uploadRef = ref(null);

// 图表相关
const chartContainer = ref(null);
let currentChart = null;
const activeChart = ref('classSize');
const tableFilter = ref('');

// KPI 卡片数据
const kpiCards = computed(() => [
  { key: 'classes', label: '类总数', value: lkData.value.length, icon: 'Grid', bgClass: 'blue-bg' },
  { key: 'avgMethod', label: '平均方法数', value: calculateAverage('totalNumberOfMethod').toFixed(1), icon: 'Document', bgClass: 'green-bg' },
  { key: 'avgAttr', label: '平均属性数', value: calculateAverage('totalNumberOfAttr').toFixed(1), icon: 'Connection', bgClass: 'purple-bg' },
  { key: 'avgNoo', label: '平均重写方法', value: calculateAverage('noo').toFixed(1), icon: 'Share', bgClass: 'pink-bg' },
  { key: 'avgNoa', label: '平均新增方法', value: calculateAverage('noa').toFixed(1), icon: 'Plus', bgClass: 'orange-bg' },
  { key: 'avgSi', label: '平均特化指数', value: calculateAverage('si').toFixed(2), icon: 'TrendCharts', bgClass: 'red-bg' }
]);

// 阈值配置
const thresholds = {
  totalNumberOfMethod: { high: 15, moderate: 8 },
  totalNumberOfAttr: { high: 15, moderate: 8 },
  noo: { high: 5, moderate: 3 },
  noa: { high: 8, moderate: 5 },
  si: { high: 0.5, moderate: 0.3 }
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
  if (!projectName.value) {
    ElMessage.warning('请输入项目名称');
    return;
  }
  if (!fileData.value) {
    ElMessage.warning('请先选择文件');
    return;
  }

  loading.value = true;

  try {
    const response = await axios({
      url: `http://127.0.0.1:8080/LKMetrics?projectName=${projectName.value}`,
      method: 'post',
      data: fileData.value,
      headers: { 'Content-Type': 'application/xml' }
    });

    processResponse(response.data);
    ElMessage.success('分析完成，记录已自动保存');
  } catch (error) {
    console.error('Error:', error);
    ElMessage.error('分析过程中出错: ' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

// 历史记录相关
const historyDialogRef = ref(null);
const openHistory = () => {
  historyDialogRef.value.open();
};

const loadHistoryData = (historyData) => {
  if (historyData && historyData.results) {
    lkData.value = historyData.results;
    setTimeout(() => createChart(), 100);
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
      totalNumberOfMethod: parseInt(getElementValue(result, 'totalNumberOfMethod')),
      totalNumberOfAttr: parseInt(getElementValue(result, 'totalNumberOfAttr')),
      noo: parseInt(getElementValue(result, 'noo')),
      noa: parseInt(getElementValue(result, 'noa')),
      si: parseFloat(getElementValue(result, 'si'))
    });
  }

  lkData.value = parsedData;
  setTimeout(() => createChart(), 100);
};

const getElementValue = (parent, tagName) => {
  const element = parent.getElementsByTagName(tagName)[0];
  return element ? element.textContent.trim() : '0';
};

// 计算函数
const calculateAverage = (metric) => {
  if (!lkData.value.length) return 0;
  return lkData.value.reduce((a, i) => a + i[metric], 0) / lkData.value.length;
};

const getPotentialIssueCount = () => getDesignIssues().length;

const getDesignIssues = () => {
  if (!lkData.value.length) return [];
  const issues = [];

  lkData.value.forEach(item => {
    if (item.totalNumberOfMethod > thresholds.totalNumberOfMethod.high) {
      issues.push({ type: 'classSize', className: item.name, message: `方法数量 (${item.totalNumberOfMethod}) 过多，考虑拆分类或重构` });
    }
    if (item.totalNumberOfAttr > thresholds.totalNumberOfAttr.high) {
      issues.push({ type: 'classSize', className: item.name, message: `属性数量 (${item.totalNumberOfAttr}) 过多，考虑拆分类或重构` });
    }
    if (item.noo > thresholds.noo.high) {
      issues.push({ type: 'inheritance', className: item.name, message: `重写方法过多 (${item.noo})，可能表明父类抽象不足` });
    }
    if (item.noa > thresholds.noa.high) {
      issues.push({ type: 'inheritance', className: item.name, message: `新增方法过多 (${item.noa})，子类可能与父类差异过大` });
    }
    if (item.si > thresholds.si.high) {
      issues.push({ type: 'specialization', className: item.name, message: `特化指数过高 (${item.si.toFixed(2)})，可能过度依赖继承` });
    }
  });
  return issues;
};

const getQualityAssessment = (item) => {
  if (item.totalNumberOfMethod > thresholds.totalNumberOfMethod.high ||
    item.totalNumberOfAttr > thresholds.totalNumberOfAttr.high ||
    item.noo > thresholds.noo.high ||
    item.noa > thresholds.noa.high ||
    item.si > thresholds.si.high) return '需要优化';
  if (item.totalNumberOfMethod > thresholds.totalNumberOfMethod.moderate ||
    item.totalNumberOfAttr > thresholds.totalNumberOfAttr.moderate ||
    item.noo > thresholds.noo.moderate ||
    item.noa > thresholds.noa.moderate ||
    item.si > thresholds.si.moderate) return '适中';
  return '良好';
};

const getQualityTagType = (item) => {
  const assessment = getQualityAssessment(item);
  if (assessment === '需要优化') return 'danger';
  if (assessment === '适中') return 'warning';
  return 'success';
};

const getMetricTagType = (value, threshold, isFloat = false) => {
  const val = isFloat ? value : Number(value);
  if (val >= threshold) return 'danger';
  if (val >= threshold * 0.6) return 'warning';
  return 'success';
};

// 表格数据
const filteredData = computed(() => {
  if (!tableFilter.value) return lkData.value;
  return lkData.value.filter(i => i.name.toLowerCase().includes(tableFilter.value.toLowerCase()));
});

// 图表函数
const createChart = () => {
  if (currentChart) currentChart.destroy();
  if (!chartContainer.value || !lkData.value.length) return;

  const ctx = document.createElement('canvas');
  chartContainer.value.innerHTML = '';
  chartContainer.value.appendChild(ctx);

  let data, options;
  const labels = lkData.value.map(i => i.name);

  switch (activeChart.value) {
    case 'classSize':
      data = {
        labels,
        datasets: [
          { label: '方法数', data: lkData.value.map(i => i.totalNumberOfMethod), backgroundColor: '#409EFF', borderRadius: 4 },
          { label: '属性数', data: lkData.value.map(i => i.totalNumberOfAttr), backgroundColor: '#E6A23C', borderRadius: 4 }
        ]
      };
      options = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: '数量' } } } };
      break;
    case 'inheritance':
      data = {
        labels,
        datasets: [
          { label: '重写方法 (NOO)', data: lkData.value.map(i => i.noo), borderColor: '#E6A23C', backgroundColor: 'rgba(230, 162, 60, 0.1)', borderWidth: 2, fill: true, tension: 0.4 },
          { label: '新增方法 (NOA)', data: lkData.value.map(i => i.noa), borderColor: '#F56C6C', backgroundColor: 'rgba(245, 108, 108, 0.1)', borderWidth: 2, fill: true, tension: 0.4 }
        ]
      };
      options = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: '方法数' } } } };
      break;
    case 'specialization':
      data = {
        labels,
        datasets: [{ label: '特化指数 (SI)', data: lkData.value.map(i => i.si), backgroundColor: 'rgba(245, 108, 108, 0.6)', borderColor: '#F56C6C', borderWidth: 1 }]
      };
      options = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'SI值' } } } };
      break;
    default: return;
  }

  currentChart = new Chart(ctx, { type: activeChart.value === 'specialization' ? 'bar' : (activeChart.value === 'inheritance' ? 'line' : 'bar'), data, options });
};

const clearResults = () => {
  lkData.value = [];
  fileData.value = '';
  fileList.value = [];
  tableFilter.value = '';
  if (currentChart) currentChart.destroy();
};

const exportData = () => {
  if (!lkData.value.length) return;
  const blob = new Blob([JSON.stringify(lkData.value, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `lk-metrics-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  ElMessage.success('导出成功');
};

watch(activeChart, () => lkData.value.length && createChart());

onUnmounted(() => {
  if (currentChart) currentChart.destroy();
});
</script>

<style scoped>
.lk-container {
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
  background: linear-gradient(135deg, #409EFF 0%, #9C27B0 100%);
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
  color: #303133;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.blue-bg {
  background-color: #ECF5FF;
}

.green-bg {
  background-color: #F0F9EB;
}

.purple-bg {
  background-color: #F3E5F5;
}

.pink-bg {
  background-color: #FCE4EC;
}

.orange-bg {
  background-color: #FFF3E0;
}

.red-bg {
  background-color: #FEF0F0;
}

.explain-card,
.issues-card,
.chart-card,
.table-card {
  border-radius: 12px;
  margin-bottom: 20px;
}

.explain-item {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.explain-item.blue {
  background-color: #ECF5FF;
  border-left: 4px solid #409EFF;
}

.explain-item.pink {
  background-color: #FCE4EC;
  border-left: 4px solid #E91E63;
}

.explain-item.orange {
  background-color: #FFF3E0;
  border-left: 4px solid #FF9800;
}

.explain-item.red {
  background-color: #FEF0F0;
  border-left: 4px solid #F56C6C;
}

.explain-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.explain-item p {
  margin: 0;
  font-size: 13px;
  color: #606266;
}

.issue-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.issue-item.classSize {
  background-color: #ECF5FF;
  border-left: 4px solid #409EFF;
}

.issue-item.inheritance {
  background-color: #FCE4EC;
  border-left: 4px solid #E91E63;
}

.issue-item.specialization {
  background-color: #FEF0F0;
  border-left: 4px solid #F56C6C;
}

.issue-class {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.issue-message {
  font-size: 12px;
  color: #606266;
}

.no-issues {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background-color: #F0F9EB;
  border-radius: 8px;
  color: #67C23A;
}

.chart-header {
  display: flex;
  justify-content: center;
}

.chart-container {
  height: 320px;
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