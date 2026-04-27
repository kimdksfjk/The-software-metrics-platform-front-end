<template>
  <div class="cocomo-container">
    <!-- 说明卡片 -->
    <el-alert title="COCOMO 成本估算模型" type="success" :closable="false" class="info-alert">
      <template #default>
        <p>COCOMO（Constructive Cost Model）是一种软件成本估算模型，通过代码行数和项目类型来估算工作量、开发时间、所需人员和成本。</p>
      </template>
    </el-alert>

    <!-- 输入表单 -->
    <el-card class="input-card" shadow="hover">
      <div class="project-name-input" style="margin-bottom: 20px;">
        <el-input v-model="projectName" placeholder="请输入项目名称 (必填)" clearable>
          <template #prepend>项目名称</template>
        </el-input>
      </div>

      <el-form :model="formData" label-width="120px" label-position="left">
        <el-form-item label="代码行数 (LoC)" required>
          <el-input-number v-model="formData.loc" :min="1" :max="1000000" placeholder="请输入代码行数" style="width: 100%" />
        </el-form-item>

        <el-form-item label="项目模式" required>
          <el-radio-group v-model="formData.mode">
            <el-radio value="organic">有机型 (Organic)</el-radio>
            <el-radio value="semi-detached">半分离型 (Semi-Detached)</el-radio>
            <el-radio value="embedded">嵌入式 (Embedded)</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button @click="openHistory" :icon="Clock" style="margin-right: 10px;">历史记录</el-button>
          <el-button type="primary" @click="handleEstimate" :loading="loading" size="large">
            <el-icon>
              <TrendCharts />
            </el-icon>
            开始估算
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 估算结果 -->
    <el-card v-if="result" class="result-card" shadow="hover">
      <template #header>
        <div class="result-header">
          <div class="header-info">
            <span>估算结果 - {{ projectName || '未命名项目' }}</span>
            <el-tag :type="getModeTagType(result.mode)" size="large" style="margin-left: 10px;">
              {{ getModeLabel(result.mode) }}
            </el-tag>
          </div>
          <div class="header-actions">
            <el-button @click="openHistory" :icon="Clock">查看历史</el-button>
            <el-button @click="clearResults" :icon="ArrowLeft">返回</el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="20" class="result-stats">
        <el-col :span="6" v-for="stat in resultStats" :key="stat.key">
          <div class="result-stat-item">
            <div class="stat-icon" :style="{ backgroundColor: stat.bgColor }">
              <el-icon :size="24" :color="stat.iconColor">
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">{{ stat.label }}</div>
              <div class="stat-value">{{ stat.value }}</div>
            </div>
          </div>
        </el-col>
      </el-row>

      <el-divider />

      <div class="formula-detail">
        <h4>计算公式详情</h4>
        <p>工作量 = {{ modeConfig.a }} × (KLoC)^{{ modeConfig.b }} = {{ result.effort.toFixed(2) }} 人月</p>
        <p>开发时间 = {{ modeConfig.c }} × (工作量)^{{ modeConfig.d }} = {{ result.time.toFixed(2) }} 月</p>
        <p>建议人员数 = {{ result.staff }} 人</p>
        <p>预估成本 = ¥{{ result.cost.toLocaleString() }} (按每人月1万元估算)</p>
      </div>
    </el-card>

    <!-- 模式对比图表 -->
    <el-card v-if="result" class="chart-card" shadow="hover">
      <template #header>
        <span>不同模式工作量对比</span>
      </template>
      <div ref="comparisonChartContainer" class="comparison-chart"></div>
    </el-card>

    <!-- 历史记录弹窗 -->
    <HistoryDialog ref="historyDialogRef" metric-type="COCOMO" @select="loadHistoryData" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { TrendCharts, Timer, User, Money, Clock, ArrowLeft } from '@element-plus/icons-vue';
import Chart from 'chart.js/auto';
import axios from 'axios';
import { historyApi } from '../../api/history';
import HistoryDialog from '../history/HistoryDialog.vue';

const projectName = ref('');
const formData = ref({
  loc: 5000,
  mode: 'organic'
});

const result = ref(null);
const loading = ref(false);
const comparisonChartContainer = ref(null);
const historyDialogRef = ref(null);
let comparisonChart = null;

const modeConfigs = {
  organic: { label: '有机型', a: 2.4, b: 1.05, c: 2.5, d: 0.38 },
  'semi-detached': { label: '半分离型', a: 3.0, b: 1.12, c: 2.5, d: 0.35 },
  embedded: { label: '嵌入式', a: 3.6, b: 1.20, c: 2.5, d: 0.32 }
};

const modeConfig = computed(() => modeConfigs[result.value?.mode || 'organic']);

const getModeLabel = (mode) => modeConfigs[mode]?.label || mode;
const getModeTagType = (mode) => {
  const types = { organic: 'success', 'semi-detached': 'warning', embedded: 'danger' };
  return types[mode] || 'info';
};

const resultStats = computed(() => [
  { key: 'effort', label: '工作量', value: `${result.value?.effort.toFixed(2)} 人月`, icon: 'Timer', bgColor: '#F0F9EB', iconColor: '#67C23A' },
  { key: 'time', label: '开发时间', value: `${result.value?.time.toFixed(2)} 月`, icon: 'Timer', bgColor: '#ECF5FF', iconColor: '#409EFF' },
  { key: 'staff', label: '建议人员数', value: `${result.value?.staff} 人`, icon: 'User', bgColor: '#FDF6EC', iconColor: '#E6A23C' },
  { key: 'cost', label: '预估成本', value: `¥${result.value?.cost.toLocaleString()}`, icon: 'Money', bgColor: '#FEF0F0', iconColor: '#F56C6C' }
]);

const handleEstimate = async () => {
  if (!projectName.value) {
    ElMessage.warning('请输入项目名称');
    return;
  }
  if (!formData.value.loc || formData.value.loc <= 0) {
    ElMessage.warning('请输入有效的代码行数');
    return;
  }

  loading.value = true;

  try {
    const res = await axios.post('http://localhost:8080/api/cocomo/estimate', formData.value);

    if (res.data.code === 200) {
      result.value = res.data.data;
      setTimeout(() => {
        createComparisonChart();
      }, 100);

      // 保存历史记录
      try {
        await historyApi.saveHistory({
          projectName: projectName.value,
          metricType: 'COCOMO',
          data: { results: [result.value] }
        });
        ElMessage.success('估算完成，记录已自动保存');
      } catch (historyError) {
        console.error('保存历史记录失败:', historyError);
        ElMessage.success('估算完成');
      }
    } else {
      ElMessage.error(res.data.message || '估算失败');
    }
  } catch (error) {
    console.error('Error:', error);
    ElMessage.error('估算失败: ' + (error.response?.data?.message || error.message || '后端接口异常'));
  } finally {
    loading.value = false;
  }
};

const clearResults = () => {
  result.value = null;
  if (comparisonChart) {
    comparisonChart.destroy();
    comparisonChart = null;
  }
};

const openHistory = () => {
  if (historyDialogRef.value) {
    historyDialogRef.value.open();
  }
};

const loadHistoryData = (row) => {
  if (row && row.data) {
    projectName.value = row.projectName || '';

    let historyResults = [];
    if (Array.isArray(row.data)) {
      historyResults = row.data;
    } else if (row.data.results && Array.isArray(row.data.results)) {
      historyResults = row.data.results;
    } else if (row.data.data && Array.isArray(row.data.data)) {
      historyResults = row.data.data;
    }

    if (historyResults.length > 0) {
      result.value = historyResults[0];
      // 恢复表单数据
      formData.value.loc = result.value.loc || 5000;
      formData.value.mode = result.value.mode || 'organic';

      setTimeout(() => {
        createComparisonChart();
      }, 200);
    } else {
      console.error('无法解析历史数据格式:', row.data);
      ElMessage.error('历史记录数据格式错误或为空');
    }
  }
};

const createComparisonChart = () => {
  if (comparisonChart) comparisonChart.destroy();
  if (!comparisonChartContainer.value) return;

  const ctx = document.createElement('canvas');
  comparisonChartContainer.value.innerHTML = '';
  comparisonChartContainer.value.appendChild(ctx);

  const loc = formData.value.loc;
  const kloc = loc / 1000;

  const modes = ['organic', 'semi-detached', 'embedded'];
  const efforts = modes.map(m => {
    const config = modeConfigs[m];
    return config.a * Math.pow(kloc, config.b);
  });

  comparisonChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['有机型', '半分离型', '嵌入式'],
      datasets: [{
        label: '工作量 (人月)',
        data: efforts,
        backgroundColor: ['#67C23A', '#E6A23C', '#F56C6C'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: '人月' } }
      }
    }
  });
};
</script>

<style scoped>
.cocomo-container {
  padding: 4px;
}

.info-alert {
  margin-bottom: 20px;
  border-radius: 8px;
}

.input-card,
.result-card,
.chart-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-stats {
  margin-bottom: 16px;
}

.result-stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.formula-detail {
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.formula-detail h4 {
  margin: 0 0 12px 0;
  color: #303133;
}

.formula-detail p {
  margin: 8px 0;
  color: #606266;
  font-family: monospace;
}

.comparison-chart {
  height: 320px;
}
</style>