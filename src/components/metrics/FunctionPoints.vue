<template>
  <div class="function-points-container">
    <!-- 说明卡片 -->
    <el-alert title="功能点度量说明" type="info" :closable="false" class="info-alert">
      <template #default>
        <p>功能点是一种衡量软件功能规模的度量单位，根据软件的功能需求来评估软件的规模。上传需求文档或XML文件，系统会自动分析并计算功能点数。</p>
      </template>
    </el-alert>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="12">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">总功能点</div>
              <div class="stat-value">{{ adjustedFP }}</div>
            </div>
            <div class="stat-icon blue-bg">
              <el-icon :size="28" color="#409EFF">
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
              <div class="stat-value">{{ estimatedManDays }} <span class="stat-unit">人天</span></div>
            </div>
            <div class="stat-icon purple-bg">
              <el-icon :size="28" color="#9C27B0">
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
        <el-empty description="上传功能点XML文件" :image-size="80">
          <template #image>
            <el-icon :size="60" color="#409EFF">
              <DataAnalysis />
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
              支持 .xml 格式的功能点描述文件
            </div>
          </template>
        </el-upload>



        <div class="upload-actions">
          <el-button @click="openHistory" :icon="Clock">历史记录</el-button>
          <el-button v-if="fileList.length" @click="clearFile">清除</el-button>
          <el-button v-if="fileList.length" type="primary" @click="analyzeXml" :loading="loading">
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
          <h2>功能点分析结果</h2>
          <p>项目: {{ projectName || '未命名项目' }} | 文件: {{ fileName }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="openHistory" :icon="Clock">查看历史</el-button>
          <el-button type="primary" @click="saveToHistory" :icon="CircleCheck">保存记录</el-button>
          <el-button @click="clearResults" :icon="ArrowLeft">返回上传</el-button>
          <el-button type="primary" @click="exportResult" :icon="Download">导出结果</el-button>
        </div>
      </div>

      <el-card class="main-card" shadow="hover">
        <!-- Step 1: 功能点划分 -->
        <el-divider content-position="left">
          <span class="step-title">1. 功能点划分</span>
        </el-divider>
        <p class="step-desc">为每个检测到的流程/资源指定功能点类型</p>

        <el-row :gutter="16">
          <el-col :span="12">
            <div class="section-title">流程项</div>
            <div v-for="(item, idx) in flowItems" :key="`flow-${idx}`" class="function-item">
              <div class="item-label">{{ item.name }}</div>
              <el-checkbox-group v-model="flowTypesMap[item.id]" size="small">
                <el-checkbox value="1">外部输入(EI)</el-checkbox>
                <el-checkbox value="2">外部输出(EO)</el-checkbox>
                <el-checkbox value="3">外部查询(EQ)</el-checkbox>
                <el-checkbox value="4">内部逻辑文件(ILF)</el-checkbox>
                <el-checkbox value="5">外部接口文件(EIF)</el-checkbox>
              </el-checkbox-group>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="section-title">资源项</div>
            <div v-for="(item, idx) in resourceItems" :key="`resource-${idx}`" class="function-item">
              <div class="item-label">{{ item.name }}</div>
              <el-checkbox-group v-model="flowTypesMap[item.id]" size="small">
                <el-checkbox value="1">外部输入(EI)</el-checkbox>
                <el-checkbox value="2">外部输出(EO)</el-checkbox>
                <el-checkbox value="3">外部查询(EQ)</el-checkbox>
                <el-checkbox value="4">内部逻辑文件(ILF)</el-checkbox>
                <el-checkbox value="5">外部接口文件(EIF)</el-checkbox>
              </el-checkbox-group>
            </div>
          </el-col>
        </el-row>

        <!-- Step 2: 未调整功能点 -->
        <el-divider content-position="left">
          <span class="step-title">2. 计算未调整功能点 (UFC)</span>
        </el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <div class="metric-section">
              <h4>外部输入 (EI)</h4>
              <div v-for="(name, i) in funcItems.ei" :key="`ei-${i}`" class="complexity-select">
                <span class="item-name">{{ name }}</span>
                <el-select v-model="eiScores[i]" size="small" style="width: 120px">
                  <el-option value="3" label="简单(3)" />
                  <el-option value="4" label="一般(4)" />
                  <el-option value="6" label="复杂(6)" />
                </el-select>
              </div>
            </div>
            <div class="metric-section">
              <h4>外部输出 (EO)</h4>
              <div v-for="(name, i) in funcItems.eo" :key="`eo-${i}`" class="complexity-select">
                <span class="item-name">{{ name }}</span>
                <el-select v-model="eoScores[i]" size="small" style="width: 120px">
                  <el-option value="4" label="简单(4)" />
                  <el-option value="5" label="一般(5)" />
                  <el-option value="7" label="复杂(7)" />
                </el-select>
              </div>
            </div>
            <div class="metric-section">
              <h4>外部查询 (EQ)</h4>
              <div v-for="(name, i) in funcItems.eq" :key="`eq-${i}`" class="complexity-select">
                <span class="item-name">{{ name }}</span>
                <el-select v-model="eqScores[i]" size="small" style="width: 120px">
                  <el-option value="3" label="简单(3)" />
                  <el-option value="4" label="一般(4)" />
                  <el-option value="6" label="复杂(6)" />
                </el-select>
              </div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="metric-section">
              <h4>内部逻辑文件 (ILF)</h4>
              <div v-for="(name, i) in funcItems.ilf" :key="`ilf-${i}`" class="complexity-select">
                <span class="item-name">{{ name }}</span>
                <el-select v-model="ilfScores[i]" size="small" style="width: 120px">
                  <el-option value="5" label="简单(5)" />
                  <el-option value="7" label="一般(7)" />
                  <el-option value="10" label="复杂(10)" />
                </el-select>
              </div>
            </div>
            <div class="metric-section">
              <h4>外部接口文件 (EIF)</h4>
              <div v-for="(name, i) in funcItems.eif" :key="`eif-${i}`" class="complexity-select">
                <span class="item-name">{{ name }}</span>
                <el-select v-model="eifScores[i]" size="small" style="width: 120px">
                  <el-option value="7" label="简单(7)" />
                  <el-option value="10" label="一般(10)" />
                  <el-option value="15" label="复杂(15)" />
                </el-select>
              </div>
            </div>
          </el-col>
        </el-row>

        <div class="calc-result">
          <span>未调整功能点 (UFC):</span>
          <strong>{{ ufc }}</strong>
        </div>

        <!-- Step 3: 技术复杂性因子 -->
        <el-divider content-position="left">
          <span class="step-title">3. 技术复杂性因子 (VAF)</span>
        </el-divider>

        <el-row :gutter="12">
          <el-col :span="6" v-for="(item, idx) in factorItems" :key="`factor-${idx}`">
            <div class="factor-item">
              <span class="factor-label">{{ item.label }}</span>
              <el-slider v-model="item.selected" :min="0" :max="5" :marks="{ 0: '0', 5: '5' }" size="small" />
            </div>
          </el-col>
        </el-row>

        <div class="calc-result">
          <span>技术复杂性因子 (VAF):</span>
          <strong>{{ vaf.toFixed(2) }}</strong>
        </div>

        <!-- Step 4: 调整后功能点 -->
        <el-divider content-position="left">
          <span class="step-title">4. 调整后功能点</span>
        </el-divider>

        <div class="final-result">
          <span>功能点 (FP = UFC × VAF):</span>
          <strong class="fp-value">{{ adjustedFP }}</strong>
        </div>

        <!-- 工作量估算 -->
        <el-divider content-position="left">
          <span class="step-title">5. 工作量估算</span>
        </el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <div class="effort-input">
              <span>完成一个功能点需要的人时</span>
              <el-input-number v-model="humanHour" :min="0" :step="1" size="small" />
              <span>人时</span>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="effort-input">
              <span>一个人月对应的人时</span>
              <el-input-number v-model="monthHour" :min="1" :step="8" size="small" />
              <span>人时</span>
            </div>
          </el-col>
        </el-row>

        <div class="calc-result final-effort">
          <span>预计工作量:</span>
          <strong>{{ estimatedManMonths }} 人月</strong>
        </div>
      </el-card>
    </div>

    <!-- 加载中 -->
    <el-dialog v-model="loading" title="分析中" :close-on-click-modal="false" :show-close="false" width="400px" center>
      <div class="loading-content">
        <el-icon class="is-loading" :size="48" color="#409EFF">
          <Loading />
        </el-icon>
        <p>正在分析功能点，请稍候...</p>
      </div>
    </el-dialog>

    <!-- 历史记录弹窗 -->
    <HistoryDialog ref="historyDialogRef" metric-type="FP" @select="loadHistoryData" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload, DataAnalysis, Timer, Loading, ArrowLeft, Download, Clock, CircleCheck } from '@element-plus/icons-vue';
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

// 后端返回的数据
const flowItems = ref([]);
const resourceItems = ref([]);
const flowTypesMap = ref({});

// 功能项分类
const funcItems = ref({
  ei: [], eo: [], eq: [], ilf: [], eif: []
});

// 复杂度得分数组
const eiScores = ref([]);
const eoScores = ref([]);
const eqScores = ref([]);
const ilfScores = ref([]);
const eifScores = ref([]);

// 技术复杂性因子
const factorItems = ref([
  { label: "数据通信", selected: 0 },
  { label: "分布式数据处理", selected: 0 },
  { label: "性能", selected: 0 },
  { label: "使用强度高的配置", selected: 0 },
  { label: "交易速度", selected: 0 },
  { label: "在线数据输入", selected: 0 },
  { label: "终端用户效率", selected: 0 },
  { label: "在线更新", selected: 0 },
  { label: "复杂处理", selected: 0 },
  { label: "可重用性", selected: 0 },
  { label: "易安装性", selected: 0 },
  { label: "易操作性", selected: 0 },
  { label: "多场所", selected: 0 },
  { label: "容易变更", selected: 0 }
]);

// 工作量参数
const humanHour = ref(28);
const monthHour = ref(167);

// 计算属性
const ufc = computed(() => {
  const sumEI = eiScores.value.reduce((a, v) => a + Number(v), 0);
  const sumEO = eoScores.value.reduce((a, v) => a + Number(v), 0);
  const sumEQ = eqScores.value.reduce((a, v) => a + Number(v), 0);
  const sumILF = ilfScores.value.reduce((a, v) => a + Number(v), 0);
  const sumEIF = eifScores.value.reduce((a, v) => a + Number(v), 0);
  return sumEI + sumEO + sumEQ + sumILF + sumEIF;
});

const vaf = computed(() => {
  const sum = factorItems.value.reduce((a, f) => a + f.selected, 0);
  return 0.65 + 0.01 * sum;
});

const adjustedFP = computed(() => Math.round(ufc.value * vaf.value));

const estimatedManDays = computed(() => {
  const totalHours = adjustedFP.value * humanHour.value;
  return (totalHours / 8).toFixed(1);
});

const estimatedManMonths = computed(() => {
  const totalHours = adjustedFP.value * humanHour.value;
  return (totalHours / monthHour.value).toFixed(1);
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
  reader.onload = (evt) => {
    fileContent.value = evt.target.result;
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
  // 重置数据
  flowItems.value = [];
  resourceItems.value = [];
  flowTypesMap.value = {};
  funcItems.value = { ei: [], eo: [], eq: [], ilf: [], eif: [] };
  eiScores.value = [];
  eoScores.value = [];
  eqScores.value = [];
  ilfScores.value = [];
  eifScores.value = [];
};

// 导出结果
const exportResult = () => {
  const exportData = {
    fileName: fileName.value,
    ufc: ufc.value,
    vaf: vaf.value,
    adjustedFP: adjustedFP.value,
    estimatedManDays: estimatedManDays.value,
    estimatedManMonths: estimatedManMonths.value,
    flowItems: flowItems.value,
    resourceItems: resourceItems.value,
    funcItems: funcItems.value
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fp-metrics-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  ElMessage.success('导出成功');
};

// 分析XML
const analyzeXml = async () => {
  if (!fileContent.value) {
    ElMessage.warning('请先选择文件');
    return;
  }

  loading.value = true;

  try {
    const res = await axios.post("http://127.0.0.1:8080/FPMetrics", fileContent.value, {
      headers: { "Content-Type": "application/xml" }
    });

    flowItems.value = res.data.flowArrayList || [];
    resourceItems.value = res.data.resourceArrayList || [];

    // 初始化 flowTypesMap
    flowTypesMap.value = {};
    for (const f of flowItems.value) flowTypesMap.value[f.id] = [];
    for (const r of resourceItems.value) flowTypesMap.value[r.id] = [];

    // 清空功能项
    funcItems.value = { ei: [], eo: [], eq: [], ilf: [], eif: [] };
    eiScores.value = [];
    eoScores.value = [];
    eqScores.value = [];
    ilfScores.value = [];
    eifScores.value = [];

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
    ufc: ufc.value,
    vaf: vaf.value,
    adjustedFP: adjustedFP.value,
    estimatedManDays: estimatedManDays.value,
    estimatedManMonths: estimatedManMonths.value,
    flowItems: flowItems.value,
    resourceItems: resourceItems.value,
    funcItems: funcItems.value,
    flowTypesMap: flowTypesMap.value,
    eiScores: eiScores.value,
    eoScores: eoScores.value,
    eqScores: eqScores.value,
    ilfScores: ilfScores.value,
    eifScores: eifScores.value,
    factorItems: factorItems.value,
    humanHour: humanHour.value,
    monthHour: monthHour.value
  };

  try {
    const response = await historyApi.saveHistory({
      projectName: projectName.value,
      metricType: 'FP',
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
    flowItems.value = data.flowItems;
    resourceItems.value = data.resourceItems;
    flowTypesMap.value = data.flowTypesMap || {};

    // Use timeout to ensure watch on flowTypesMap doesn't overwrite scores if they are provided
    setTimeout(() => {
      if (data.funcItems) funcItems.value = data.funcItems;
      if (data.eiScores) eiScores.value = data.eiScores;
      if (data.eoScores) eoScores.value = data.eoScores;
      if (data.eqScores) eqScores.value = data.eqScores;
      if (data.ilfScores) ilfScores.value = data.ilfScores;
      if (data.eifScores) eifScores.value = data.eifScores;
      if (data.factorItems) factorItems.value = data.factorItems;
      if (data.humanHour) humanHour.value = data.humanHour;
      if (data.monthHour) monthHour.value = data.monthHour;

      analysisDone.value = true;
    }, 50);
  }
};

// 监听 flowTypesMap 变化，更新分类
watch(flowTypesMap, () => {
  funcItems.value = { ei: [], eo: [], eq: [], ilf: [], eif: [] };

  const pushToFunc = (category, name) => {
    switch (category) {
      case "1": funcItems.value.ei.push(name); break;
      case "2": funcItems.value.eo.push(name); break;
      case "3": funcItems.value.eq.push(name); break;
      case "4": funcItems.value.ilf.push(name); break;
      case "5": funcItems.value.eif.push(name); break;
    }
  };

  for (const f of flowItems.value) {
    const selectedVals = flowTypesMap.value[f.id] || [];
    for (const val of selectedVals) pushToFunc(val, f.name);
  }
  for (const r of resourceItems.value) {
    const selectedVals = flowTypesMap.value[r.id] || [];
    for (const val of selectedVals) pushToFunc(val, r.name);
  }

  // 初始化分数
  eiScores.value = funcItems.value.ei.map(() => 3);
  eoScores.value = funcItems.value.eo.map(() => 4);
  eqScores.value = funcItems.value.eq.map(() => 3);
  ilfScores.value = funcItems.value.ilf.map(() => 5);
  eifScores.value = funcItems.value.eif.map(() => 7);
}, { deep: true });
</script>

<style scoped>
.function-points-container {
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

.blue-bg {
  background-color: #ECF5FF;
}

.purple-bg {
  background-color: #F3E5F5;
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
  background: linear-gradient(135deg, #409EFF 0%, #9C27B0 100%);
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
  color: #409EFF;
}

.step-desc {
  font-size: 13px;
  color: #909399;
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #EBEEF5;
}

.function-item {
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 12px;
}

.item-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.metric-section {
  margin-bottom: 20px;
  padding: 12px;
  background-color: #fafafa;
  border-radius: 8px;
}

.metric-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #606266;
}

.complexity-select {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed #EBEEF5;
}

.item-name {
  font-size: 13px;
  color: #606266;
}

.calc-result {
  text-align: right;
  padding: 12px 16px;
  background-color: #ECF5FF;
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
  color: #409EFF;
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin: 16px 0;
}

.final-result span {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  margin-right: 16px;
}

.fp-value {
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
  background-color: #F0F9EB;
}

.final-effort strong {
  color: #67C23A;
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