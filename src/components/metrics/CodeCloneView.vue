<template>
  <div class="clone-container">
    <el-alert
      title="代码重复率检测 (DRY 原则守护者)"
      type="warning"
      :closable="false"
      class="info-alert"
    >
      <template #default>
        <p>基于 <b>N-Gram 滑动窗口文本特征指纹算法</b>。同时上传多个源代码文件，系统将精准揪出项目中“复制粘贴”产生的冗余代码块（Code Clones）。重复率超过 10% 即判定为技术债务过高。</p>
      </template>
    </el-alert>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="upload-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>批量代码查重</span>
            </div>
          </template>
          <div class="upload-content">
            <el-upload
              drag
              multiple
              :auto-upload="false"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove"
              :file-list="fileList"
              accept=".java,.py,.js,.cpp"
            >
              <el-icon class="upload-icon"><DocumentCopy /></el-icon>
              <div class="upload-text">
                将多个代码文件拖到此处，或<em>点击上传</em>
              </div>
            </el-upload>
            <div class="upload-actions" v-if="fileList.length >= 2">
              <el-button @click="clearFiles">清空</el-button>
              <el-button type="warning" @click="startDetection" :loading="loading">
                <el-icon><Monitor /></el-icon> 启动查重引擎
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>重复率仪表盘 (Gauge Chart)</span>
            </div>
          </template>
          <div v-show="hasResult" ref="gaugeChartRef" class="gauge-chart"></div>
          <el-empty v-show="!hasResult" description="等待扫描..." />
          
          <div v-if="hasResult" class="analysis-details">
            <p>共扫描代码特征块：<b>{{ resultData.totalLinesProcessed }}</b> 个</p>
            <p>发现高度重合代码块：<b style="color: #F56C6C;">{{ resultData.duplicateBlockCount }}</b> 处</p>
            <p>存在复制粘贴嫌疑的文件：</p>
            <el-tag 
              v-for="file in resultData.filesWithClones" 
              :key="file" 
              type="danger" 
              effect="plain" 
              class="clone-tag"
            >
              {{ file }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, nextTick, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { DocumentCopy, Monitor } from '@element-plus/icons-vue';
import axios from 'axios';
import * as echarts from 'echarts';

const fileList = ref([]);
const loading = ref(false);
const hasResult = ref(false);
const resultData = ref({});
const gaugeChartRef = ref(null);
let myChart = null;

const handleFileChange = (file, files) => { fileList.value = files; };
const handleFileRemove = (file, files) => { fileList.value = files; };
const clearFiles = () => {
  fileList.value = [];
  hasResult.value = false;
  if (myChart) myChart.dispose();
};

const startDetection = async () => {
  if (fileList.value.length < 2) {
    ElMessage.warning('查重至少需要 2 个文件');
    return;
  }

  loading.value = true;
  const formData = new FormData();
  fileList.value.forEach(file => {
    formData.append('files', file.raw);
  });

  try {
    const res = await axios.post('http://127.0.0.1:8080/api/clone/detect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (res.data.code === 200) {
      resultData.value = res.data.data;
      hasResult.value = true;
      ElMessage.success('查重扫描完成！');
      
      nextTick(() => {
        renderGaugeChart(resultData.value.cloneRate);
      });
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('查重引擎请求失败');
  } finally {
    loading.value = false;
  }
};

// 核心 ECharts 仪表盘渲染逻辑
const renderGaugeChart = (rate) => {
  if (myChart) myChart.dispose();
  myChart = echarts.init(gaugeChartRef.value);

  // 动态决定颜色：<10% 绿色，>10% 红色警报
  const color = rate > 10 ? '#F56C6C' : '#67C23A';

  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        center: ['50%', '75%'],
        radius: '110%',
        min: 0,
        max: 100,
        splitNumber: 10,
        axisLine: {
          lineStyle: { width: 15, color: [[rate / 100, color], [1, '#E6E8ED']] }
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '12%',
          width: 20,
          offsetCenter: [0, '-60%'],
          itemStyle: { color: 'auto' }
        },
        axisTick: { length: 12, lineStyle: { color: 'auto', width: 2 } },
        splitLine: { length: 20, lineStyle: { color: 'auto', width: 5 } },
        axisLabel: { color: '#464646', fontSize: 14, distance: -60, formatter: '{value} %' },
        title: { offsetCenter: [0, '-20%'], fontSize: 20 },
        detail: {
          fontSize: 36,
          offsetCenter: [0, '0%'],
          valueAnimation: true,
          formatter: '{value} %',
          color: 'auto'
        },
        data: [{ value: rate, name: '当前重复率' }]
      }
    ]
  };

  myChart.setOption(option);
};

// 防止内存泄漏
onUnmounted(() => {
  if (myChart) myChart.dispose();
});
</script>

<style scoped>
.clone-container { padding: 4px; }
.info-alert { margin-bottom: 20px; border-radius: 8px; }
.upload-card, .chart-card { border-radius: 12px; height: 480px; }
.upload-actions { display: flex; justify-content: center; gap: 16px; margin-top: 20px; }
.gauge-chart { width: 100%; height: 280px; }
.analysis-details {
  margin-top: -20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  font-size: 14px;
}
.clone-tag { margin-right: 8px; margin-bottom: 8px; }
</style>