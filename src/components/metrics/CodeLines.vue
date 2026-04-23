<template>
  <div class="code-lines-container">
    <!-- 说明卡片 -->
    <el-alert
      title="代码行度量分析"
      type="info"
      :closable="false"
      class="info-alert"
    >
      <template #default>
        <p>代码行度量统计源代码的物理行数、逻辑行数、注释行数等，评估项目规模和代码质量。上传源代码文件，系统将自动进行统计分析。</p>
      </template>
    </el-alert>

    <!-- 文件上传区域 -->
    <el-card v-if="!results.length" class="upload-card" shadow="hover">
      <div class="upload-content">
        <el-empty description="上传源代码文件" :image-size="80">
          <template #image>
            <el-icon :size="60" color="#409EFF"><UploadFilled /></el-icon>
          </template>
        </el-empty>
        
        <el-upload
          ref="uploadRef"
          drag
          multiple
          :auto-upload="false"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :file-list="fileList"
          action="#"
          class="upload-area"
        >
          <el-icon class="upload-icon"><Upload /></el-icon>
          <div class="upload-text">
            将文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="upload-tip">
              支持多文件上传，支持 .java, .py, .js 等源代码文件
            </div>
          </template>
        </el-upload>
        
        <div class="upload-actions" v-if="fileList.length">
          <el-button @click="clearFiles">清除</el-button>
          <el-button type="primary" @click="uploadFiles" :loading="loading">
            开始分析
          </el-button>
        </div>
      </div>
    </el-card>
    
    <!-- 分析结果 -->
    <div v-if="results.length" class="results-container">
      <!-- 结果头部 -->
      <div class="results-header">
        <div class="header-info">
          <h2>代码行分析结果</h2>
          <p>分析了 {{ results.length }} 个文件，共 {{ totalCodeLines }} 行代码</p>
        </div>
        <div class="header-actions">
          <el-button @click="clearResults" :icon="ArrowLeft">返回上传</el-button>
          <el-button type="primary" @click="exportResults" :icon="Download">导出数据</el-button>
        </div>
      </div>
      
      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6" v-for="stat in statsCards" :key="stat.key">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-info">
                <div class="stat-label">{{ stat.label }}</div>
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-percent">{{ stat.percent }}%</div>
              </div>
              <div class="stat-icon" :style="{ backgroundColor: stat.bgColor }">
                <el-icon :size="24" :color="stat.iconColor">
                  <component :is="stat.icon" />
                </el-icon>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <!-- 图表区域 -->
      <el-row :gutter="20" class="charts-row">
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <span>代码组成分析</span>
            </template>
            <div ref="compositionChartContainer" class="chart-container"></div>
          </el-card>
        </el-col>
        
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>文件代码行排行</span>
                <el-select v-model="topFilesCount" size="small" style="width: 100px">
                  <el-option :value="5" label="Top 5" />
                  <el-option :value="10" label="Top 10" />
                  <el-option :value="15" label="Top 15" />
                  <el-option :value="0" label="全部" />
                </el-select>
              </div>
            </template>
            <div ref="topFilesChartContainer" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
      
      <!-- 详细数据表格 -->
      <el-card shadow="hover" class="table-card">
        <template #header>
          <div class="table-header">
            <span>文件详细统计</span>
            <div class="table-tools">
              <el-input
                v-model="searchQuery"
                placeholder="搜索文件..."
                :prefix-icon="Search"
                size="small"
                style="width: 200px"
                clearable
              />
              <el-select v-model="sortBy" size="small" style="width: 120px" @change="handleSortChange">
                <el-option value="fileName" label="文件名" />
                <el-option value="codeLines" label="代码行" />
                <el-option value="commentLines" label="注释行" />
                <el-option value="blankLines" label="空白行" />
                <el-option value="total" label="总行数" />
              </el-select>
              <el-button :icon="sortDirection === 'asc' ? SortUp : SortDown" size="small" @click="toggleSortDirection" />
            </div>
          </div>
        </template>
        
        <el-table :data="filteredAndSortedResults" stripe style="width: 100%">
          <el-table-column prop="fileName" label="文件名" min-width="200">
            <template #default="{ row }">
              <div class="file-name-cell">
                <el-icon :color="getFileIconColor(row.fileName)"><Document /></el-icon>
                <span>{{ row.fileName }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="codeLines" label="代码行" width="100" sortable>
            <template #default="{ row }">
              <el-tag type="success" size="small">{{ row.codeLines }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="commentLines" label="注释行" width="100" sortable>
            <template #default="{ row }">
              <el-tag type="warning" size="small">{{ row.commentLines }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="blankLines" label="空白行" width="100" sortable>
            <template #default="{ row }">
              <el-tag type="info" size="small">{{ row.blankLines }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="总行数" width="100" sortable>
            <template #default="{ row }">
              <el-tag type="primary" size="small">{{ row.codeLines + row.commentLines + row.blankLines }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="构成比例" min-width="200">
            <template #default="{ row }">
              <el-progress :percentage="getCodePercentage(row)" :color="'#67C23A'" :stroke-width="8" />
              <div class="progress-labels">
                <span class="code-label">代码</span>
                <span class="comment-label">注释</span>
                <span class="blank-label">空白</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
    
    <!-- 加载中 -->
    <el-dialog v-model="loading" title="分析中" :close-on-click-modal="false" :show-close="false" width="400px" center>
      <div class="loading-content">
        <el-progress type="circle" :percentage="uploadProgress" :width="80" />
        <p>正在处理您的代码文件，这可能需要一点时间...</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  UploadFilled, Upload, Document, ArrowLeft, Download,
  Search, SortUp, SortDown, DataAnalysis, FolderOpened,
  Files, Collection, Ticket
} from '@element-plus/icons-vue';
import Chart from 'chart.js/auto';

// State variables
const selectedFiles = ref([]);
const results = ref([]);
const loading = ref(false);
const uploadProgress = ref(0);
const searchQuery = ref('');
const sortBy = ref('codeLines');
const sortDirection = ref('desc');
const topFilesCount = ref(5);
const fileList = ref([]);
const uploadRef = ref(null);

// DOM refs
const compositionChartContainer = ref(null);
const topFilesChartContainer = ref(null);

// Chart instances
let compositionChart = null;
let topFilesChart = null;

// Stats cards data
const statsCards = computed(() => [
  { key: 'files', label: '总文件数', value: results.value.length, percent: '', icon: 'Files', bgColor: '#ECF5FF', iconColor: '#409EFF' },
  { key: 'code', label: '代码行', value: totalCodeLines.value, percent: codeLinePercentage.value, icon: 'Document', bgColor: '#F0F9EB', iconColor: '#67C23A' },
  { key: 'comment', label: '注释行', value: totalCommentLines.value, percent: commentLinePercentage.value, icon: 'Collection', bgColor: '#FDF6EC', iconColor: '#E6A23C' },
  { key: 'blank', label: '空白行', value: totalBlankLines.value, percent: blankLinePercentage.value, icon: 'Ticket', bgColor: '#F4F4F5', iconColor: '#909399' }
]);

// File handlers
const handleFileChange = (file, fileListData) => {
  fileList.value = fileListData;
  selectedFiles.value = fileListData.map(f => f.raw);
};

const handleFileRemove = (file, fileListData) => {
  fileList.value = fileListData;
  selectedFiles.value = fileListData.map(f => f.raw);
};

const clearFiles = () => {
  fileList.value = [];
  selectedFiles.value = [];
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
};

// Upload files to server
const uploadFiles = async () => {
  if (!selectedFiles.value.length) {
    ElMessage.warning('请选择要上传的文件');
    return;
  }
  
  loading.value = true;
  uploadProgress.value = 0;
  
  const formData = new FormData();
  for (let i = 0; i < selectedFiles.value.length; i++) {
    formData.append('files', selectedFiles.value[i]);
  }
  
  try {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        uploadProgress.value = Math.round((event.loaded / event.total) * 100);
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error('Upload failed'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.open('POST', 'http://127.0.0.1:8080/countCode');
      xhr.send(formData);
    });
    
    results.value = response;
    ElMessage.success('分析完成');
    
    setTimeout(() => {
      createCompositionChart();
      createTopFilesChart();
    }, 100);
    
  } catch (error) {
    console.error('Error uploading files:', error);
    ElMessage.error('文件上传失败: ' + error.message);
  } finally {
    loading.value = false;
    clearFiles();
  }
};

// Clear results
const clearResults = () => {
  results.value = [];
  searchQuery.value = '';
  sortBy.value = 'codeLines';
  sortDirection.value = 'desc';
  
  if (compositionChart) {
    compositionChart.destroy();
    compositionChart = null;
  }
  if (topFilesChart) {
    topFilesChart.destroy();
    topFilesChart = null;
  }
};

// Export results
const exportResults = () => {
  if (!results.value.length) return;
  
  const dataStr = JSON.stringify(results.value, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `code-metrics-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  ElMessage.success('导出成功');
};

// Helper functions
const getFileIconColor = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  const colors = {
    java: '#E76F00',
    py: '#3776AB',
    js: '#F7DF1E',
    ts: '#3178C6',
    html: '#E34F26',
    css: '#1572B6',
    vue: '#42B883'
  };
  return colors[ext] || '#909399';
};

const getCodePercentage = (file) => {
  const total = file.codeLines + file.commentLines + file.blankLines;
  return total ? Math.round((file.codeLines / total) * 100) : 0;
};

// Create composition chart
const createCompositionChart = () => {
  if (compositionChart) compositionChart.destroy();
  if (!compositionChartContainer.value || !results.value.length) return;
  
  const ctx = document.createElement('canvas');
  compositionChartContainer.value.innerHTML = '';
  compositionChartContainer.value.appendChild(ctx);
  
  compositionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['代码行', '注释行', '空白行'],
      datasets: [{
        data: [totalCodeLines.value, totalCommentLines.value, totalBlankLines.value],
        backgroundColor: ['#67C23A', '#E6A23C', '#909399'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
};

// Create top files chart
const createTopFilesChart = () => {
  if (topFilesChart) topFilesChart.destroy();
  if (!topFilesChartContainer.value || !results.value.length) return;
  
  const ctx = document.createElement('canvas');
  topFilesChartContainer.value.innerHTML = '';
  topFilesChartContainer.value.appendChild(ctx);
  
  const topFiles = [...results.value]
    .sort((a, b) => b.codeLines - a.codeLines)
    .slice(0, topFilesCount.value || results.value.length);
  
  topFilesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: topFiles.map(f => f.fileName.length > 15 ? f.fileName.substring(0, 12) + '...' : f.fileName),
      datasets: [
        { label: '代码行', data: topFiles.map(f => f.codeLines), backgroundColor: '#67C23A', borderRadius: 4 },
        { label: '注释行', data: topFiles.map(f => f.commentLines), backgroundColor: '#E6A23C', borderRadius: 4 },
        { label: '空白行', data: topFiles.map(f => f.blankLines), backgroundColor: '#909399', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
    }
  });
};

// Computed properties
const totalCodeLines = computed(() => results.value.reduce((sum, f) => sum + f.codeLines, 0));
const totalCommentLines = computed(() => results.value.reduce((sum, f) => sum + f.commentLines, 0));
const totalBlankLines = computed(() => results.value.reduce((sum, f) => sum + f.blankLines, 0));
const totalLines = computed(() => totalCodeLines.value + totalCommentLines.value + totalBlankLines.value);
const codeLinePercentage = computed(() => totalLines.value ? Math.round((totalCodeLines.value / totalLines.value) * 100) : 0);
const commentLinePercentage = computed(() => totalLines.value ? Math.round((totalCommentLines.value / totalLines.value) * 100) : 0);
const blankLinePercentage = computed(() => totalLines.value ? Math.round((totalBlankLines.value / totalLines.value) * 100) : 0);

const filteredAndSortedResults = computed(() => {
  let filtered = [...results.value];
  if (searchQuery.value) {
    filtered = filtered.filter(item => item.fileName.toLowerCase().includes(searchQuery.value.toLowerCase()));
  }
  filtered.sort((a, b) => {
    let valA, valB;
    if (sortBy.value === 'fileName') {
      valA = a.fileName.toLowerCase();
      valB = b.fileName.toLowerCase();
    } else if (sortBy.value === 'total') {
      valA = a.codeLines + a.commentLines + a.blankLines;
      valB = b.codeLines + b.commentLines + b.blankLines;
    } else {
      valA = a[sortBy.value];
      valB = b[sortBy.value];
    }
    return sortDirection.value === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
  });
  return filtered;
});

const toggleSortDirection = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
};

const handleSortChange = () => {
  // Sort already handled by computed
};

watch(topFilesCount, () => {
  if (results.value.length) createTopFilesChart();
});

onUnmounted(() => {
  if (compositionChart) compositionChart.destroy();
  if (topFilesChart) topFilesChart.destroy();
});
</script>

<style scoped>
.code-lines-container {
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.stat-percent {
  font-size: 12px;
  color: #67C23A;
  margin-top: 4px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.charts-row {
  margin-bottom: 20px;
}

.chart-card {
  border-radius: 12px;
  height: 400px;
}

.chart-container {
  height: 320px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  align-items: center;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-labels {
  display: flex;
  gap: 16px;
  margin-top: 4px;
  font-size: 12px;
}

.code-label { color: #67C23A; }
.comment-label { color: #E6A23C; }
.blank-label { color: #909399; }

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