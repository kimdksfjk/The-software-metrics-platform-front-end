<template>
    <div>
      <div class="bg-amber-50 rounded-lg p-4 mb-6 border border-amber-100">
        <div class="flex items-start">
          <svg class="h-6 w-6 text-amber-500 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <p class="text-amber-800 font-medium">控制流图度量说明</p>
            <p class="text-amber-600 text-sm mt-1">
              控制流图度量分析程序的执行路径，计算圈复杂度、路径数等指标，评估代码的复杂程度和测试难度。上传源代码，系统将自动构建控制流图并分析。
            </p>
          </div>
        </div>
      </div>
  
      <div class="grid grid-cols-3 gap-6 mb-6">
        <div class="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div class="text-lg font-medium text-gray-600">平均圈复杂度</div>
          <div class="text-3xl font-bold text-amber-600 mt-2">-</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div class="text-lg font-medium text-gray-600">函数总数</div>
          <div class="text-3xl font-bold text-amber-600 mt-2">0</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div class="text-lg font-medium text-gray-600">最大圈复杂度</div>
          <div class="text-3xl font-bold text-amber-600 mt-2">-</div>
        </div>
      </div>
  
      <div class="grid grid-cols-2 gap-6 mb-6">
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="text-lg font-medium text-gray-600 mb-4">圈复杂度分布</div>
          <div class="h-64 flex items-center justify-center bg-gray-50 rounded border">
            <p class="text-gray-400">图表将在分析后显示</p>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="text-lg font-medium text-gray-600 mb-4">控制流图预览</div>
          <div class="h-64 flex items-center justify-center bg-gray-50 rounded border">
            <div>
              <svg class="h-12 w-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
              </svg>
              <p class="text-gray-400">选择函数后查看控制流图</p>
            </div>
          </div>
        </div>
      </div>
  
      <div class="bg-white border shadow-sm rounded-lg overflow-hidden">
        <div class="px-6 py-3 bg-gray-50 border-b text-gray-800 font-medium">
          函数圈复杂度列表
        </div>
        <div class="p-6 text-center text-gray-500 py-12">
          <svg class="h-12 w-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
          </svg>
          <p>尚未上传源代码进行分析</p>
          <button class="mt-4 bg-amber-100 text-amber-700 px-4 py-2 rounded-md hover:bg-amber-200 transition duration-300">
            选择文件上传
          </button>
        </div>
      </div>
    </div>
  </template>