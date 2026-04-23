<template>
  <div class="sidebar-container">
    <div class="logo-section">
      <el-icon :size="28" color="#409EFF"><DataAnalysis /></el-icon>
      <span class="logo-text">自动化软件度量平台</span>
    </div>
    
    <el-menu
      :default-active="currentPage"
      class="sidebar-menu"
      @select="handleSelect"
      :collapse="isCollapse"
    >
      <el-menu-item index="functionPoints">
        <el-icon><Setting /></el-icon>
        <span>功能点度量</span>
      </el-menu-item>
      
      <el-menu-item index="useCase">
        <el-icon><Connection /></el-icon>
        <span>用例图度量</span>
      </el-menu-item>
      
      <el-menu-item index="objectOriented">
        <el-icon><Grid /></el-icon>
        <span>CK度量</span>
      </el-menu-item>
      
      <el-menu-item index="LKmetrics">
        <el-icon><Share /></el-icon>
        <span>LK度量</span>
      </el-menu-item>
      
      <el-menu-item index="codeLines">
        <el-icon><Document /></el-icon>
        <span>代码行度量</span>
      </el-menu-item>
      
      <el-menu-item index="cocomo">
        <el-icon><TrendCharts /></el-icon>
        <span>COCOMO估算</span>
      </el-menu-item>
      
      <el-menu-item index="flowgraph">
        <el-icon><Share /></el-icon>
        <span>流程图度量</span>
      </el-menu-item>
    </el-menu>
    
    <div class="user-section">
      <el-divider />
      <div class="user-info">
        <el-avatar :size="40" icon="UserFilled" />
        <div class="user-details" v-if="!isCollapse">
          <span class="user-name">CSUer</span>
          <span class="user-version">v2.0.0</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  currentPage: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['change-page']);

const isCollapse = ref(false);

const handleSelect = (index) => {
  emit('change-page', index);
};
</script>

<style scoped>
.sidebar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.logo-section {
  padding: 24px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #ebeef5;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  padding: 16px 8px;
}

.user-section {
  padding: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.user-version {
  font-size: 12px;
  color: #909399;
}
</style>