<template>
  <div class="flowgraph-container">
    <!-- 说明卡片 -->
    <el-alert
      title="程序流程图度量"
      type="warning"
      :closable="false"
      class="info-alert"
    >
      <template #default>
        <p>圈复杂度 = 边数 - 节点数 + 2，用于评估代码的复杂程度和测试难度。上传Draw.io导出的流程图XML文件，系统将自动分析圈复杂度。</p>
      </template>
    </el-alert>

    <!-- 文件上传区域 -->
    <el-card v-if="!result" class="upload-card" shadow="hover">
      <div class="upload-content">
        <el-empty description="上传流程图文件" :image-size="80">
          <template #image>
            <el-icon :size="60" color="#E6A23C"><Share /></el-icon>
          </template>
        </el-empty>
        
        <div class="project-name-input" style="margin-bottom: 20px;">
          <el-input v-model="projectName" placeholder="请输入项目名称 (必填)" clearable>
            <template #prepend>项目名称</template>
          </el-input>
        </div>
        
        <el-upload
          ref="uploadRef"
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          :file-list="fileList"
          action="#"
          accept=".xml"
          class="upload-area"
        >
          <el-icon class="upload-icon"><Upload /></el-icon>
          <div class="upload-text">
            将XML文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="upload-tip">
              支持 Draw.io 导出的 .xml 格式流程图文件
            </div>
          </template>
        </el-upload>
        
        <div class="upload-actions" v-if="fileList.length">
          <el-button @click="openHistory" :icon="Clock">历史记录</el-button>
          <el-button @click="clearFile">清除</el-button>
          <el-button type="warning" @click="analyzeFile" :loading="loading">
            开始分析
          </el-button>
        </div>
      </div>
    </el-card>
    
    <!-- 分析结果 -->
    <div v-if="result" class="results-container">
      <!-- 结果头部 -->
      <div class="results-header">
        <div class="header-info">
          <h2>流程图度量结果</h2>
          <p>项目: {{ projectName || '未命名项目' }} | 文件: {{ result.fileName }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="openHistory" :icon="Clock">查看历史</el-button>
          <el-button @click="clearResults" :icon="ArrowLeft">返回上传</el-button>
          <el-button type="warning" @click="exportResult" :icon="Download">导出结果</el-button>
        </div>
      </div>
      
      <!-- 历史记录弹窗 -->
      <HistoryDialog ref="historyDialogRef" metric-type="VG" @select="loadHistoryData" />
      
      <!-- 核心指标卡片 -->
      <el-row :gutter="20" class="metrics-row">
        <el-col :span="6">
          <div class="metric-card" :class="getComplexityClass(result.cyclomaticComplexity)">
            <div class="metric-icon">
              <el-icon :size="28"><Share /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ result.cyclomaticComplexity }}</div>
              <div class="metric-label">圈复杂度</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="metric-card">
            <div class="metric-icon">
              <el-icon :size="28"><Grid /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ result.nodeCount }}</div>
              <div class="metric-label">节点数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="metric-card">
            <div class="metric-icon">
              <el-icon :size="28"><Connection /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ result.edgeCount }}</div>
              <div class="metric-label">边数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="metric-card">
            <div class="metric-icon">
              <el-icon :size="28"><Document /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ result.branchCount || 0 }}</div>
              <div class="metric-label">分支数</div>
            </div>
          </div>
        </el-col>
      </el-row>
      
      <!-- 复杂度仪表盘和建议 -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="hover" class="gauge-card">
            <template #header>
              <span>复杂度等级</span>
            </template>
            <div ref="gaugeChartContainer" class="gauge-chart"></div>
            <div class="complexity-level" :class="getComplexityClass(result.cyclomaticComplexity)">
              {{ result.complexityLevel || getComplexityLevel(result.cyclomaticComplexity) }}
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="12">
          <el-card shadow="hover" class="suggestion-card">
            <template #header>
              <span>改进建议</span>
            </template>
            <div class="suggestion-content">
              <el-icon :size="24" :color="getSuggestionIconColor(result.cyclomaticComplexity)">
                <WarningFilled />
              </el-icon>
              <p>{{ result.suggestion || getSuggestion(result.cyclomaticComplexity) }}</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <!-- 复杂度阈值说明 -->
      <el-card class="threshold-card" shadow="hover">
        <template #header>
          <span>圈复杂度阈值说明</span>
        </template>
        <el-table :data="thresholdData" stripe size="small">
          <el-table-column prop="level" label="等级" width="100" />
          <el-table-column prop="range" label="范围" width="150" />
          <el-table-column prop="description" label="说明" />
        </el-table>
      </el-card>
    </div>
    
    <!-- 加载中 -->
    <el-dialog v-model="loading" title="分析中" :close-on-click-modal="false" :show-close="false" width="400px" center>
      <div class="loading-content">
        <el-icon class="is-loading" :size="48" color="#E6A23C"><Loading /></el-icon>
        <p>正在分析流程图，请稍候...</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  Upload, Share, ArrowLeft, Download, Grid, Connection, Document, 
  WarningFilled, Loading, Clock 
} from '@element-plus/icons-vue';
import Chart from 'chart.js/auto';
import axios from 'axios';
import { historyApi } from '../../api/history';
import HistoryDialog from '../history/HistoryDialog.vue';

// 状态变量
const projectName = ref('');
const fileList = ref([]);
const fileContent = ref('');
const result = ref(null);
const loading = ref(false);
const uploadRef = ref(null);
const gaugeChartContainer = ref(null);
const historyDialogRef = ref(null);
let gaugeChart = null;

// 阈值数据
const thresholdData = [
  { level: '低', range: '1-5', description: '代码质量良好，易于维护' },
  { level: '中等', range: '6-10', description: '中等复杂度，建议适当简化' },
  { level: '高', range: '11-15', description: '高复杂度，必须重构' },
  { level: '极高', range: '>15', description: '极高复杂度，存在严重质量风险' }
];

// 辅助函数
const getComplexityLevel = (complexity) => {
  if (complexity <= 5) return '低';
  if (complexity <= 10) return '中等';
  if (complexity <= 15) return '高';
  return '极高';
};

const getComplexityClass = (complexity) => {
  if (complexity <= 5) return 'complexity-low';
  if (complexity <= 10) return 'complexity-moderate';
  if (complexity <= 15) return 'complexity-high';
  return 'complexity-extreme';
};

const getSuggestionIconColor = (complexity) => {
  if (complexity <= 5) return '#67C23A';
  if (complexity <= 10) return '#E6A23C';
  return '#F56C6C';
};

const getSuggestion = (complexity) => {
  if (complexity <= 5) return '代码质量良好，建议保持当前设计';
  if (complexity <= 10) return '代码复杂度适中，建议适当简化判定节点';
  if (complexity <= 15) return '代码复杂度较高，建议重构复杂模块';
  return '代码复杂度极高，存在严重质量风险，强烈建议重构';
};

// 文件处理
const handleFileChange = (file) => {
  if (!file.raw.name.endsWith('.xml')) {
    ElMessage.warning('请上传 .xml 文件');
    return;
  }
  fileList.value = [file];
  const reader = new FileReader();
  reader.onload = (evt) => {
    fileContent.value = evt.target.result;
  };
  reader.readAsText(file.raw);
};

const clearFile = () => {
  fileList.value = [];
  fileContent.value = '';
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
};

// 分析文件
const analyzeFile = async () => {
  if (!projectName.value) {
    ElMessage.warning('请输入项目名称');
    return;
  }
  if (!fileContent.value) {
    ElMessage.warning('请先选择文件');
    return;
  }
  
  loading.value = true;
  
  try {
    // 使用 FormData 发送文件
    const formData = new FormData();
    formData.append('file', fileList.value[0].raw);
    
    const res = await axios.post('http://127.0.0.1:8080/api/flowgraph/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if(res.data.code === 200) {
      result.value = res.data.data;
      setTimeout(() => {
        createGaugeChart();
      }, 100);
      
      // 保存历史记录
      try {
        const response = await historyApi.saveHistory({
          projectName: projectName.value,
          metricType: 'VG',
          data: { results: [result.value] }
        });
        if (response.data.success) {
          ElMessage.success('分析完成，记录已自动保存');
        }
      } catch (historyError) {
        console.error('保存历史记录失败:', historyError);
      }
    } else {
      ElMessage.error(res.data.message || '解析XML失败');
    }
  } catch (error) {
    console.error('Error:', error);
    ElMessage.error('上传解析失败: ' + (error.response?.data?.message || error.message || '请检查后端服务是否启动'));
  } finally {
    loading.value = false;
  }
};

// 历史记录相关
const openHistory = () => {
  historyDialogRef.value.open();
};

const loadHistoryData = (row) => {
  if (row && row.data) {
    projectName.value = row.projectName || '';
    
    let historyResults = [];
    // 灵活处理不同的数据包装格式
    if (Array.isArray(row.data)) {
      historyResults = row.data;
    } else if (row.data.results && Array.isArray(row.data.results)) {
      historyResults = row.data.results;
    } else if (row.data.data && Array.isArray(row.data.data)) {
      historyResults = row.data.data;
    }

    if (historyResults.length > 0) {
      result.value = historyResults[0];
      setTimeout(() => {
        createGaugeChart();
      }, 200);
    } else {
      console.error('无法解析历史数据格式:', row.data);
      ElMessage.error('历史记录数据格式错误或为空');
    }
  }
};

// 清除结果
const clearResults = () => {
  result.value = null;
  clearFile();
  if (gaugeChart) {
    gaugeChart.destroy();
    gaugeChart = null;
  }
};

// 导出结果
const exportResult = () => {
  if (!result.value) return;
  
  const dataStr = JSON.stringify(result.value, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `flowgraph-metrics-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  ElMessage.success('导出成功');
};

// 创建仪表盘图表
const createGaugeChart = () => {
  if (gaugeChart) {
    gaugeChart.destroy();
  }
  
  if (!gaugeChartContainer.value || !result.value) return;
  
  const ctx = document.createElement('canvas');
  gaugeChartContainer.value.innerHTML = '';
  gaugeChartContainer.value.appendChild(ctx);
  
  const complexity = result.value.cyclomaticComplexity;
  let color = '#67C23A';
  if (complexity > 10) color = '#F56C6C';
  else if (complexity > 5) color = '#E6A23C';
  
  // 计算百分比（最大按20计算）
  const percentage = Math.min(complexity / 20 * 100, 100);
  
  gaugeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [percentage, 100 - percentage],
        backgroundColor: [color, '#E4E7ED'],
        borderWidth: 0,
        circumference: 360,
        rotation: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        tooltip: { 
          callbacks: {
            label: function(context) {
              if (context.dataIndex === 0) {
                return `复杂度: ${complexity}`;
              }
              return '';
            }
          }
        },
        legend: { display: false }
      }
    }
  });
  
  // 添加中心文字
  const centerText = document.createElement('div');
  centerText.style.position = 'absolute';
  centerText.style.top = '50%';
  centerText.style.left = '50%';
  centerText.style.transform = 'translate(-50%, -50%)';
  centerText.style.textAlign = 'center';
  centerText.style.fontSize = '24px';
  centerText.style.fontWeight = 'bold';
  centerText.style.color = color;
  centerText.innerText = complexity;
  
  const canvasContainer = gaugeChartContainer.value;
  canvasContainer.style.position = 'relative';
  const oldText = canvasContainer.querySelector('.center-text');
  if (oldText) oldText.remove();
  centerText.className = 'center-text';
  canvasContainer.appendChild(centerText);
};
</script>

<style scoped>
.flowgraph-container {
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

.metrics-row {
  margin-bottom: 20px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background-color: #f5f7fa;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.metric-card.complexity-low { background: linear-gradient(135deg, #F0F9EB, #E8F5E9); border-left: 4px solid #67C23A; }
.metric-card.complexity-moderate { background: linear-gradient(135deg, #FDF6EC, #FFF3E0); border-left: 4px solid #E6A23C; }
.metric-card.complexity-high { background: linear-gradient(135deg, #FEF0F0, #FFEBEE); border-left: 4px solid #F56C6C; }
.metric-card.complexity-extreme { background: linear-gradient(135deg, #FEF0F0, #FFEBEE); border-left: 4px solid #F56C6C; }

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}

.metric-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.gauge-card,
.suggestion-card,
.threshold-card {
  border-radius: 12px;
  margin-bottom: 20px;
}

.gauge-chart {
  height: 200px;
  position: relative;
}

.complexity-level {
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  padding: 10px;
  border-radius: 8px;
  margin-top: 16px;
}

.complexity-level.complexity-low { background-color: #F0F9EB; color: #67C23A; }
.complexity-level.complexity-moderate { background-color: #FDF6EC; color: #E6A23C; }
.complexity-level.complexity-high { background-color: #FEF0F0; color: #F56C6C; }
.complexity-level.complexity-extreme { background-color: #FEF0F0; color: #F56C6C; }

.suggestion-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

.suggestion-content p {
  margin: 0;
  font-size: 15px;
  color: #606266;
  line-height: 1.5;
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
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>