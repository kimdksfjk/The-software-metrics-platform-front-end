import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8080';

export const historyApi = {
    /**
     * 手动保存历史记录
     * @param {Object} data { projectName, metricType, data: { results: [...] } }
     */
    saveHistory(data) {
        return axios.post(`${API_BASE_URL}/history/save`, data);
    },

    /**
     * 获取历史记录列表
     * @param {string} metricType CK, LK, VG, LOC, UCP, FP
     * @param {string} projectName 可选
     */
    getHistoryList(metricType, projectName = '') {
        return axios.get(`${API_BASE_URL}/history/list`, {
            params: { metricType, projectName }
        });
    },

    /**
     * 获取项目名称列表
     * @param {string} metricType
     */
    getProjectList(metricType) {
        return axios.get(`${API_BASE_URL}/history/projects`, {
            params: { metricType }
        });
    }
};
