// components/custom-card/custom-card.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    item: {
      type: Object,
      value: {}
    },
    // 用于过滤的属性，例如可以按类型过滤
    cardType: {
      type: String,
      value: 'all' // 默认显示所有类型
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 内部数据
    isVisible: true
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 点击卡片
    onCardTap: function() {
      this.triggerEvent('cardtap', {
        item: this.data.item
      });
    },
    
    // 点击问题
    onQuestionTap: function() {
      this.triggerEvent('questiontap', {
        questionId: this.data.item.question_id
      });
    },
    
    // 点击回答
    onAnswerTap: function() {
      this.triggerEvent('answertap', {
        answerId: this.data.item.answer_id
      });
    },
    
    // 点击更多
    onMoreTap: function() {
      this.triggerEvent('moretap', {
        item: this.data.item
      });
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function() {
      // 组件实例进入页面节点树时执行
      // 可以在这里根据属性初始化显示状态
      this.updateVisibility();
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'cardType, item': function(cardType, item) {
      this.updateVisibility();
    }
  },
  
  /**
   * 组件私有方法
   */
  methods: {
    // 更新卡片可见性
    updateVisibility: function() {
      // 根据卡片类型和属性决定是否显示
      // 这里仅做一个示例，具体逻辑需要根据实际情况调整
      let isVisible = true;
      
      if (this.data.cardType !== 'all') {
        // 用于屏蔽特定类型的卡片
        // 例如，如果卡片类型是 'question'，则只显示问题类型的卡片
        isVisible = this.data.item.type === this.data.cardType;
      }
      
      // 您可以添加更多复杂的过滤逻辑，例如关键词过滤等
      
      this.setData({
        isVisible: isVisible
      });
    }
  }
})
