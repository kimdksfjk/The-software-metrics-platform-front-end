<template>
  <el-dialog
    v-model="visible"
    :title="`历史记录 - ${metricType}`"
    width="70%"
    destroy-on-close
  >
    <div class="history-controls">
      <el-select
        v-model="selectedProject"
        placeholder="筛选项目"
        clearable
        @change="fetchHistory"
        style="width: 200px; margin-bottom: 20px;"
      >
        <el-option
          v-for="project in projectList"
          :key="project"
          :label="project"
          :value="project"
        />
      </el-select>
      <el-button :icon="Refresh" @click="fetchHistory" circle style="margin-left: 10px;" />
    </div>

    <el-table :data="historyList" v-loading="loading" style="width: 100%" border stripe>
      <el-table-column prop="projectName" label="项目名称" width="180" />
      <el-table-column prop="time" label="分析时间" width="200">
        <template #default="scope">
          {{ formatDate(scope.row.time) }}
        </template>
      </el-table-column>
      <el-table-column label="数据详情">
        <template #default="scope">
          <el-tag size="small" type="info">包含 {{ getDataCount(scope.row.data) }} 条结果</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="scope">
          <el-button
            type="primary"
            size="small"
            @click="useHistory(scope.row)"
          >
            加载
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { historyApi } from '../../api/history';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';

const props = defineProps({
  metricType: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['select']);

const visible = ref(false);
const loading = ref(false);
const historyList = ref([]);
const projectList = ref([]);
const selectedProject = ref('');

const open = async () => {
  visible.value = true;
  await fetchProjects();
  await fetchHistory();
};

const fetchProjects = async () => {
  try {
    const response = await historyApi.getProjectList(props.metricType);
    if (response.data.success) {
      projectList.value = response.data.data;
    }
  } catch (error) {
    console.error('获取项目列表失败:', error);
  }
};

const fetchHistory = async () => {
  loading.value = true;
  try {
    const response = await historyApi.getHistoryList(props.metricType, selectedProject.value);
    if (response.data.success) {
      historyList.value = response.data.data;
    }
  } catch (error) {
    console.error('获取历史记录失败:', error);
    ElMessage.error('获取历史记录失败');
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString();
};

const getDataCount = (data) => {
  if (data && data.results) {
    return data.results.length;
  }
  // Fallback for different data structures if any
  if (Array.isArray(data)) return data.length;
  return 0;
};

const useHistory = (row) => {
  emit('select', row.data);
  visible.value = false;
  ElMessage.success(`已加载项目 ${row.projectName} 的历史记录`);
};

defineExpose({
  open
});
</script>

<style scoped>
.history-controls {
  display: flex;
  align-items: center;
}
</style>
