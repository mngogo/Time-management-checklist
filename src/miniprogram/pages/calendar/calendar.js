import DataService from '../../datas/DataService';
// import { LEVEL } from '../../datas/Config';
import {
    promiseHandle,
    log,
    formatNumber
} from '../../utils/util';

Page({

    /**事项各项数据.
     * data作用域Page
     */
    data: {
        showMonth: {},
        data: {
            showMonth: ''
        },
        selectDateText: '',
        pickerDateValue: '',

        isSelectMode: false,
        isMaskShow: false,
        isEditMode: false,

        // modal
        isModalShow: false,
        modalMsg: '',

        // //事项等级数据
        // levelSelectedValue: LEVEL.normal,
        // levelSelectData: [LEVEL.normal, LEVEL.warning, LEVEL.danger],

        // updatePanel 数据
        updatePanelTop: 10000,
        updatePanelAnimationData: {},
        todoInputValue: '',
        todoTextAreaValue: '',

        // 事项列表
        itemList: [],
        editItemList: [] //编辑勾选中的事项id
    },

    onLoad() {
        let _this = this;

        promiseHandle(wx.getSystemInfo).then((data) => {
            _this.setData({
                updatePanelTop: data.windowHeight
            });
        });

        changeDate.call(this);
    },

    onReady() {
        loadItemListData.call(this);
    },

    datePickerChangeEvent(e) {
        const date = new Date(Date.parse(e.detail.value));
        changeDate.call(this, new Date(date.getFullYear(), date.getMonth(), 1));
    },

    changeDateEvent(e) {
        const {
            year,
            month
        } = e.currentTarget.dataset;
        changeDate.call(this, new Date(year, parseInt(month) - 1, 1));
    },

    dateClickEvent(e) {
        const {
            year,
            month,
            date
        } = e.currentTarget.dataset;
        const {
            data
        } = this.data;
        let selectDateText = '';

        // 字符串作为数组下标，是一种对象访问方式.
        data['selected']['year'] = year;
        data['selected']['month'] = month;
        data['selected']['date'] = date;

        this.setData({
            data: data
        });

        changeDate.call(this, new Date(year, parseInt(month) - 1, date));
    },

    showUpdatePanelEvent() {
        showUpdatePanel.call(this);
        this.setData({
            isEditMode: true
        });
    },

    closeUpdatePanelEvent() {
        closeUpdatePanel.call(this);
    },

    editClickEvent() {
        this.setData({
            isEditMode: true
        });
    },

    /** 事项列表项长按动作事件
     * 其实被点击动作调用了……
     */
    listItemLongTapEvent(e) {
        const {
            isEditMode
        } = this.data;
        const {
            id
        } = e.currentTarget.dataset;
        let _this = this;
        //如果不是编辑勾选模式下才生效
        if (!isEditMode) {
            const itemList = ['详情', '删除'];
            //promiseHandle来自util.js
            promiseHandle(wx.showActionSheet, {
                    itemList: itemList,
                    itemColor: '#2E2E3B'
                })
                .then((res) => {
                    if (!res.cancel) {
                        switch (itemList[res.tapIndex]) {
                            case '详情':
                                wx.navigateTo({
                                    url: '../detail/detail?id=' + id
                                });
                                break;
                            case '删除':
                                new DataService({
                                    _id: id
                                }).delete().then(() => {
                                    loadItemListData.call(_this);
                                });
                                break;
                        }
                    }
                });
        }
    },

    /**取消编辑事件
     * 点击「取消」键
     */
    cancelEditClickEvent() {
        this.setData({
            isEditMode: false
        });
        resetItemListDataCheck.call(this);
    },

    /** 事项标题文本框变化事件*/
    todoInputChangeEvent(e) {
        const {
            value
        } = e.detail;
        this.setData({
            todoInputValue: value
        });
    },

    /**事项内容多行文本域变化事件*/
    todoTextAreaChangeEvent(e) {
        const {
            value
        } = e.detail;
        this.setData({
            todoTextAreaValue: value
        });
    },

    /*   // 选择事项等级事件  
      levelClickEvent(e) {
        const { level } = e.currentTarget.dataset;
        this.setData({ levelSelectedValue: level });
      },
     */

    /**保存事项数据.*/
    saveDataEvent() {
        const {
            /**事项具体时间.*/
            todoInputValue,
            /**事项内容.*/
            todoTextAreaValue
        } = this.data; //data作用域Page
        const {
            year,
            month,
            date
        } = this.data.data.selected; //selected选中的年月日
        console.log(todoTextAreaValue); //控制台写日志
        if (todoInputValue !== '') {
            let promise = new DataService({ //数据传给一个中间类
                title: todoInputValue,
                content: todoTextAreaValue,
                // level: levelSelectedValue,
                year: year,
                month: parseInt(month) - 1,
                date: date
            }).save();
            promise && promise.then(() => {
                //清空表单
                this.setData({ //微信小程序API 详见 https://developers.weixin.qq.com/miniprogram/dev/reference/api/Page.html#Page.prototype.setData(Object%20data,%20Function%20callback)
                    todoTextAreaValue: '',
                    todoInputValue: ''
                });
                loadItemListData.call(this);
            })

            closeUpdatePanel.call(this);
        } else {
            showModal.call(this, '请填写事项内容');
        }
    },

    /**批量删除事件
     * 这里批量删除指的是选中后批量删除选中项目
     */
    removeRangeTapEvent() {
        let {
            itemList
        } = this.data;
        if (!itemList) return;
        let _this = this;
        wx.showModal({
            title: '提示',
            content: '确定要删除选定的事项？',
            success: (res) => {
                if (res.confirm) {
                    DataService.deleteRange(_this.data.editItemList).then(() => {
                        loadItemListData.call(_this);
                    });
                    _this.setData({ //setData见 https://developers.weixin.qq.com/miniprogram/dev/reference/api/Page.html#Page.prototype.setData(Object%20data,%20Function%20callback)
                        editItemList: [],
                        isEditMode: false
                    });
                }
            }
        });
    },

    /** 事项列表项的点击事件*/
    listItemClickEvent(e) {
        const {
            isEditMode
        } = this.data;
        const {
            id
        } = e.currentTarget.dataset;

        if (!isEditMode) {
            this.listItemLongTapEvent(e); //由于元素的长按和点击事件有冲突，暂时合并在一起，直接调用长按事件（本文件）
            return;
        }
        let data = this.data.itemList || []; //data作用域listItemClickEvent(e)
        //若itemList有值则不变，无值则取[]
        let editItemList = this.data.editItemList || []; //若editItemList有值则不变，无值则取[]
        //findIndex:JavaScript API
        //查找目标元素，找到就返回元素的位置，找不到就返回-1
        const index = data.findIndex((item) => {
            return item['_id'] == id;
        });

        if (index >= 0) {
            data[index]['checked'] = !data[index]['checked'];
            const tIndx = editItemList.findIndex((item) => {
                return item == id;
            });
            if (data[index]['checked']) {
                tIndx >= 0 || editItemList.push(id);
            } else {
                editItemList.splice(tIndx, 1);
            }
            this.setData({
                itemList: data,
                editItemList: editItemList
            });
        }
    },

    //提示模态窗口关闭事件
    closeModalEvent() {
        closeModal.call(this);
    }
});






/**
 * 显示事项数据添加更新面板
 */
function showUpdatePanel() {
    let animation = wx.createAnimation({
        duration: 600
    });
    animation.translateY('-100%').step();
    this.setData({
        updatePanelAnimationData: animation.export()
    });
}

/**
 * 显示模态窗口
 * @param {String} msg 显示消息
 */
function showModal(msg) {
    this.setData({
        isModalShow: true,
        isMaskShow: true,
        modalMsg: msg
    });
}

/**
 * 关闭模态窗口
 */
function closeModal() {
    this.setData({
        isModalShow: false,
        isMaskShow: false,
        modalMsg: ''
    });
}

/**
 * 关闭事项数据添加更新面板
 */
function closeUpdatePanel() {
    let animation = wx.createAnimation({
        duration: 600
    });
    animation.translateY('100%').step();
    this.setData({
        updatePanelAnimationData: animation.export()
    });
}

/**
 * 加载事项列表数据
 */
function loadItemListData() {
    const {
        year,
        month,
        date
    } = this.data.data.selected;
    let _this = this;
    DataService.findByDate(new Date(Date.parse([year, month, date].join('-')))).then((data) => {
        _this.setData({
            itemList: data
        });
    });

}

/**
 * 重置是项列表勾选记录
 */
function resetItemListDataCheck() {
    let data = this.data.itemList || []; //data作用域resetItemListDataCheck()
    for (let i = 0, len = data.length; i < len; i++) {
        data[i]['checked'] = false;
    }
    this.setData({
        itemList: data
    });
}

/**
 * 变更日期数据
 * @param {Date} targetDate 当前日期对象
 */
function changeDate(targetDate) {
    let date = targetDate || new Date();
    let currentDateObj = new Date();

    let showMonth, //当天显示月份
        showYear, //当前显示年份
        showDay, //当前显示星期
        showDate, //当前显示第几天
        showMonthFirstDateDay, //当前显示月份第一天的星期
        showMonthLastDateDay, //当前显示月份最后一天的星期
        showMonthDateCount; //当前月份的总天数

    let data = []; //data作用域changeDate(targetDate)

    showDate = date.getDate(); //库函数
    showMonth = date.getMonth() + 1; //库函数
    showYear = date.getFullYear(); //库函数
    showDay = date.getDay(); //库函数

    showMonthDateCount = new Date(showYear, showMonth, 0).getDate();
    date.setDate(1);
    showMonthFirstDateDay = date.getDay(); //当前显示月份第一天的星期
    date.setDate(showMonthDateCount);
    showMonthLastDateDay = date.getDay(); //当前显示月份最后一天的星期  

    let beforeDayCount = 0,
        beforeYear, //上页月年份
        beforMonth, //上页月份
        afterYear, //下页年份
        afterMonth, //下页月份
        afterDayCount = 0, //上页显示天数
        beforeMonthDayCount = 0; //上页月份总天数

    //上一个月月份
    beforMonth = showMonth === 1 ? 12 : showMonth - 1;
    //上一个月年份
    beforeYear = showMonth === 1 ? showYear - 1 : showYear;
    //下个月月份
    afterMonth = showMonth === 12 ? 1 : showMonth + 1;
    //下个月年份
    afterYear = showMonth === 12 ? showYear + 1 : showYear;

    //获取上一页的显示天数
    if (showMonthFirstDateDay != 0)
        beforeDayCount = showMonthFirstDateDay - 1;
    else
        beforeDayCount = 6;

    //获取下页的显示天数
    if (showMonthLastDateDay != 0)
        afterDayCount = 7 - showMonthLastDateDay;
    else
        showMonthLastDateDay = 0;

    //如果天数不够6行，则补充完整
    let tDay = showMonthDateCount + beforeDayCount + afterDayCount;
    if (tDay <= 35)
        afterDayCount += (42 - tDay); //6行7列 = 42

    let selected = this.data.data['selected'] || { //对象的||or&&，进行布尔值的逻辑运算。当运算到某一个变量就得出最终结果之后，就返回哪个变量。
        //此处意为若selected为"" , false , 0 , null , undefined , NaN，返回后面的对象，否则不变。
        //selected作用域changeDate
        /**在本文件赋值 */
        year: showYear,
        /**在本文件赋值 */
        month: showMonth,
        /**在本文件赋值 */
        date: showDate
    };
    let selectDateText = selected.year + '年' + formatNumber(selected.month) + '月' + formatNumber(selected.date) + '日';

    //data作用域Page
    data = {
        currentDate: currentDateObj.getDate(), //当天日期第几天
        currentYear: currentDateObj.getFullYear(), //当天年份
        currentDay: currentDateObj.getDay(), //当天星期
        currentMonth: currentDateObj.getMonth() + 1, //当天月份
        showMonth: showMonth, //当前显示月份
        showDate: showDate, //当前显示月份的第几天 
        showYear: showYear, //当前显示月份的年份
        beforeYear: beforeYear, //当前页上一页的年份
        beforMonth: beforMonth, //当前页上一页的月份
        afterYear: afterYear, //当前页下一页的年份
        afterMonth: afterMonth, //当前页下一页的月份
        selected: selected,
        selectDateText: selectDateText
    };

    let dates = [];
    let _id = 0; //为wx:key指定

    if (beforeDayCount > 0) {
        beforeMonthDayCount = new Date(beforeYear, beforMonth, 0).getDate();
        for (let fIdx = 0; fIdx < beforeDayCount; fIdx++) {
            dates.unshift({
                _id: _id,
                year: beforeYear,
                month: beforMonth,
                date: beforeMonthDayCount - fIdx
            });
            _id++;
        }
    }

    for (let cIdx = 1; cIdx <= showMonthDateCount; cIdx++) {
        dates.push({
            _id: _id,
            active: (selected['year'] == showYear && selected['month'] == showMonth && selected['date'] == cIdx), //选中状态判断
            year: showYear,
            month: showMonth,
            date: cIdx
        });
        _id++;
    }

    if (afterDayCount > 0) {
        for (let lIdx = 1; lIdx <= afterDayCount; lIdx++) {
            dates.push({
                _id: _id,
                year: afterYear,
                month: afterMonth,
                date: lIdx
            });
            _id++;
        }
    }

    data.dates = dates;


    this.setData({
        data: data,
        pickerDateValue: showYear + '-' + showMonth
    });
    loadItemListData.call(this);
}
