<template>
  <el-container class="app-container">
    <!-- Left Sidebar -->
    <el-aside :width="sidebarWidth" class="app-aside">
      <Sidebar :currentPage="currentPage" @change-page="currentPage = $event" />
    </el-aside>

    <!-- Right Content Area -->
    <el-container>
      <el-main class="app-main">
        <el-card class="content-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">{{ pageTitle }}</span>
            </div>
          </template>
          
          <!-- Dynamic Content -->
          <component :is="currentComponent" />
        </el-card>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue';
import Sidebar from './components/layout/Sidebar.vue';
import FunctionPoints from './components/metrics/FunctionPoints.vue';
import UseCase from './components/metrics/UseCase.vue';
import ObjectOriented from './components/metrics/ObjectOriented.vue';
import LKmetrics from './components/metrics/LKmetrics.vue';
import CodeLines from './components/metrics/CodeLines.vue';
import CocomoView from './components/metrics/CocomoView.vue';
import FlowGraphView from './components/metrics/FlowGraphView.vue';
import { usePageTitle } from './composables/usePageTitle';

// Sidebar width
const sidebarWidth = ref('280px');

// Current page state
const currentPage = ref('functionPoints');

// Get page title from composable
const { pageTitle } = usePageTitle(currentPage);

// Dynamically load component based on current page
const currentComponent = computed(() => {
  switch (currentPage.value) {
    case 'functionPoints':
      return FunctionPoints;
    case 'useCase':
      return UseCase;
    case 'objectOriented':
      return ObjectOriented;
    case 'LKmetrics':
      return LKmetrics;
    case 'codeLines':
      return CodeLines;
    case 'cocomo':
      return CocomoView;
    case 'flowgraph':
      return FlowGraphView;
    default:
      return FunctionPoints;
  }
});
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.app-aside {
  background-color: #ffffff;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.05);
  overflow-y: auto;
}

.app-main {
  padding: 20px;
  background-color: #f5f7fa;
}

.content-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}
</style>