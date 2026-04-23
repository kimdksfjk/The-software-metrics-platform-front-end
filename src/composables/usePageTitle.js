// composables/usePageTitle.js
import { computed } from 'vue'

export function usePageTitle(currentPage) {
  const pageTitle = computed(() => {
    const titles = {
      functionPoints: '功能点度量',
      useCase: '用例图度量',
      objectOriented: 'CK度量',
      LKmetrics: 'LK度量',
      codeLines: '代码行度量',
      cocomo: 'COCOMO成本估算',
      flowgraph: '流程图度量'
    }
    return titles[currentPage.value] || '软件度量工具'
  })

  return { pageTitle }
}