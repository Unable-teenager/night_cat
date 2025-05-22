// index.js
const defaultAvatarUrl =
	"https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0";

Page({
	data: {
		// General data
		currentMode: "normalMode", // normalMode, lateNightMode, recoveryMode
		currentDate: "",

		// Normal mode data
		periods: ["本月", "本周", "本日"],
		selectedPeriodIndex: 2,
		chartImages: [
			"https://img-blog.csdnimg.cn/cb30d0fd1f414bfba09a441d99dd0d4f.png",
			"https://img-blog.csdnimg.cn/845459d4f6564162be79cee37c8bab07.png",
			"https://img-blog.csdnimg.cn/8d9a0221276b479c8997865363bc5973.png",
		],
		sleepData: {
			qualityScore: 85,
			duration: "7小时30分钟",
			deepSleep: "2小时15分钟",
			lightSleep: "4小时00分钟",
			awakeTime: "1次",
		},

		// Late night mode data
		currentTime: "--:--",
		screenTime: "0小时0分钟",
		hasCheckedIn: false,
		checkInData: {
			wakeUpTime: "",
			sleepTime: "",
		},
		aiTip: "",
		showAiActions: false,

		// Recovery mode data
		hasBodyTest: false,
		recoveryProgress: 0,
		recoveryMessage: "",
		completedRecoveryTasks: 0,
		recoveryRecommendations: [],
		recoveryChecklist: [],

		// Modal data
		showBodyTestModal: false,
		bodyTestQuestions: [
			{
				question: "您是否容易感到疲劳？",
				options: ["从不", "偶尔", "经常", "总是"],
				answer: null,
			},
			{
				question: "您的睡眠质量如何？",
				options: ["非常好", "较好", "一般", "较差", "非常差"],
				answer: null,
			},
			{
				question: "您平均每天睡眠时长是多少？",
				options: ["少于5小时", "5-6小时", "6-7小时", "7-8小时", "8小时以上"],
				answer: null,
			},
			{
				question: "您是否有规律的作息时间？",
				options: ["非常规律", "较规律", "一般", "不太规律", "完全不规律"],
				answer: null,
			},
			{
				question: "您平均每周熬夜（23点后睡觉）的次数是？",
				options: ["0次", "1-2次", "3-4次", "5-6次", "每天都熬夜"],
				answer: null,
			},
			{
				question: "您是否经常感到早上起床困难？",
				options: ["从不", "偶尔", "经常", "总是"],
				answer: null,
			},
			{
				question: "您的饮食规律性如何？",
				options: ["非常规律", "较规律", "一般", "不太规律", "完全不规律"],
				answer: null,
			},
			{
				question: "您平均每周运动的次数是？",
				options: ["0次", "1-2次", "3-4次", "5次以上"],
				answer: null,
			},
		],

		showActivityTutorial: false,
		activityTutorial: null,
	},

	onLoad() {
		this.checkFirstLogin();
		this.setCurrentDate();
		this.generateMockData();
		this.startClock();
		this.initRecoveryData();
		this.generateRecoveryRecommendations();
	},

	onShow() {
		this.checkFirstLogin();
		this.updateCurrentTime();
		this.checkScreenTime();
		this.generateAiTips();
	},

	// General functions
	setCurrentDate() {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth() + 1;
		const day = now.getDate();
		this.setData({
			currentDate: `${year}年${month}月${day}日`,
		});
	},

	switchMode(e) {
		const mode = e.currentTarget.dataset.mode;
		this.setData({
			currentMode: mode,
		});

		// If switching to recovery mode, check if we should suggest recovery
		if (mode === "recoveryMode" && !this.data.recoveryRecommendations.length) {
			this.generateRecoveryRecommendations();
		}

		// If switching to late night mode, update AI tips
		if (mode === "lateNightMode") {
			this.generateAiTips();
		}
	},

	// First login check and body test
	checkFirstLogin() {
		const hasBodyTest = wx.getStorageSync("hasCompletedBodyTest");
		if (!hasBodyTest) {
			this.setData({ showBodyTestModal: true });
		} else {
			this.setData({ showBodyTestModal: false, hasBodyTest: true });
		}
	},

	answerQuestion(e) {
		const index = e.currentTarget.dataset.index;
		const value = Number.parseInt(e.detail.value, 10);

		// Update the question's answer
		const questions = this.data.bodyTestQuestions;
		questions[index].answer = value;

		this.setData({
			bodyTestQuestions: questions,
		});
	},

	submitBodyTest() {
		// Check if all questions are answered
		const allAnswered = this.data.bodyTestQuestions.every(
			(q) => q.answer !== null,
		);

		if (!allAnswered) {
			wx.showToast({
				title: "请回答所有问题",
				icon: "none",
			});
			return;
		}

		// Generate body type report
		const bodyType = this.generateBodyTypeReport();

		// Save body test result
		wx.setStorageSync("bodyTestResult", bodyType);
		wx.setStorageSync("hasCompletedBodyTest", true);

		// Update state
		this.setData({
			showBodyTestModal: false,
			hasBodyTest: true,
		});

		// Show success message
		wx.showModal({
			title: "体质测试完成",
			content: `您的体质类型：${bodyType.type}\n\n${bodyType.description}\n\n您可以在个人信息页面查看详细报告。`,
			showCancel: false,
			confirmText: "我知道了",
		});
	},

	generateBodyTypeReport() {
		// Simple algorithm to determine body type based on answers
		const answers = this.data.bodyTestQuestions.map((q) => q.answer);

		// Calculate fatigue score (questions 0, 5)
		const fatigueScore = (answers[0] + answers[5]) / 2;

		// Calculate sleep score (questions 1, 2, 4)
		const sleepScore = (answers[1] + answers[2] + answers[4]) / 3;

		// Calculate lifestyle score (questions 3, 6, 7)
		const lifestyleScore = (answers[3] + answers[6] + (3 - answers[7])) / 3;

		// Determine body type based on scores
		let type = "";
		let description = "";
		let healthScore = 0;

		if (fatigueScore > 2 && sleepScore > 2 && lifestyleScore > 2) {
			type = "疲劳体质";
			description = "您的身体较为疲惫，需要加强休息和调整生活习惯。";
			healthScore = 60;
		} else if (sleepScore > 2) {
			type = "睡眠不足体质";
			description = "您的睡眠质量较差，建议调整睡眠时间和环境。";
			healthScore = 70;
		} else if (lifestyleScore > 2) {
			type = "生活不规律体质";
			description = "您的生活习惯不够规律，建议建立健康的生活规律。";
			healthScore = 75;
		} else {
			type = "健康体质";
			description = "您的整体健康状况良好，继续保持健康的生活方式。";
			healthScore = 85;
		}

		return {
			type,
			description,
			healthScore,
			details: {
				fatigueScore: Math.max(0, 100 - fatigueScore * 25),
				sleepScore: Math.max(0, 100 - sleepScore * 20),
				lifestyleScore: Math.max(0, 100 - lifestyleScore * 25),
			},
		};
	},

	closeBodyTestModal() {
		this.setData({
			showBodyTestModal: false,
		});

		// Remind user they can do it later
		wx.showToast({
			title: "您可以稍后在个人信息页面完成测试",
			icon: "none",
			duration: 2000,
		});
	},

	// Normal mode functions
	generateMockData() {
		// Random data for demo
		const random = () => Math.floor(Math.random() * 100);
		this.setData({
			"sleepData.qualityScore": (random() % 50) + 50, // 50-100
			"sleepData.duration": `${(random() % 4) + 5}小时${random() % 60}分钟`,
			"sleepData.deepSleep": `${(random() % 2) + 1}小时${random() % 60}分钟`,
			"sleepData.lightSleep": `${(random() % 3) + 3}小时${random() % 60}分钟`,
			"sleepData.awakeTime": `${random() % 4}次`,
		});
	},

	navigateToAnalysis() {
		// 存储睡眠数据
		wx.setStorageSync("currentSleepData", this.data.sleepData);

		// 记录导航时间
		wx.setStorageSync("navTestTime", new Date().toString());

		// 使用navigateTo使页面可以返回上一级
		wx.navigateTo({
			url: "../analysis/analysis",
			success: () => {
				console.log("导航到分析页面成功");
			},
			fail: (err) => {
				console.error("导航到分析页面失败:", err);

				// 尝试使用reLaunch作为备选方案
				wx.reLaunch({
					url: "/pages/analysis/analysis",
					fail: (finalErr) => {
						console.error("所有导航方法均失败:", finalErr);
						wx.showToast({
							title: "无法打开分析页面",
							icon: "none",
							duration: 3000,
						});
					},
				});
			},
		});
	},

	/**
	 * 备用导航测试函数
	 * 使用navigateTo方法
	 */
	testNavigateToAnalysis() {
		// 存储睡眠数据
		wx.setStorageSync("currentSleepData", this.data.sleepData);

		// 记录测试时间
		wx.setStorageSync("navTestTime", new Date().toString());

		// 使用navigateTo尝试导航（保留当前页面）
		wx.navigateTo({
			url: "../analysis/analysis",
			success: () => {
				console.log("备用导航成功");
			},
			fail: (err) => {
				console.error("备用导航失败:", err);

				// 尝试使用其他方法
				wx.navigateBack({
					delta: 0,
					complete: () => {
						// 立即尝试reLaunch
						wx.reLaunch({
							url: "/pages/analysis/analysis",
							fail: (finalErr) => {
								console.error("所有备用导航方法失败:", finalErr);
								wx.showToast({
									title: "所有导航方法均失败",
									icon: "none",
									duration: 3000,
								});
							},
						});
					},
				});
			},
		});
	},

	onPeriodChange(e) {
		const selectedPeriodIndex = Number.parseInt(e.detail.value, 10);
		this.setData({
			selectedPeriodIndex,
		});
	},

	// Late night mode functions
	startClock() {
		// Update time immediately
		this.updateCurrentTime();

		// Update time every minute
		setInterval(() => {
			this.updateCurrentTime();
		}, 60000);
	},

	updateCurrentTime() {
		const now = new Date();
		const hours = now.getHours().toString().padStart(2, "0");
		const minutes = now.getMinutes().toString().padStart(2, "0");

		this.setData({
			currentTime: `${hours}:${minutes}`,
		});
	},

	checkScreenTime() {
		// In a real app, this would use device APIs to get actual screen time
		// For demo, we'll use mock data
		const now = new Date();
		const hours = now.getHours();

		let screenHours = 0;
		let screenMinutes = 0;

		if (hours >= 22 || hours < 6) {
			// Late night
			screenHours = Math.floor(Math.random() * 3) + 1;
			screenMinutes = Math.floor(Math.random() * 60);
		} else {
			// Day time
			screenHours = Math.floor(Math.random() * 2);
			screenMinutes = Math.floor(Math.random() * 60);
		}

		this.setData({
			screenTime: `${screenHours}小时${screenMinutes}分钟`,
		});
	},

	generateAiTips() {
		const now = new Date();
		const hours = now.getHours();
		const screenTimeParts = this.data.screenTime.split("小时");
		const screenHours = Number.parseInt(screenTimeParts[0], 10);

		let tip = "";
		let showActions = false;

		if (hours >= 23 || hours < 5) {
			// Late night tips
			if (screenHours > 2) {
				tip =
					"您已经连续使用屏幕超过2小时了，建议休息一下眼睛，或者进行一些护眼活动。";
				showActions = true;
			} else if (hours >= 0 && hours < 5) {
				tip = "现在已经很晚了，长时间熬夜会影响您的健康，建议尽快休息。";
				showActions = false;
			}
		} else if (hours >= 22) {
			// Evening tips
			tip =
				"晚上使用电子设备会影响睡眠质量，建议减少使用时间，或者使用护眼模式。";
			showActions = screenHours > 1;
		} else {
			// Day time tips
			if (screenHours > 1) {
				tip = "长时间使用电子设备会导致视疲劳，建议每隔45分钟休息一下眼睛。";
				showActions = true;
			} else {
				tip = "欢迎使用熬夜模式，这里会提醒您注意用眼健康和作息时间。";
				showActions = false;
			}
		}

		this.setData({
			aiTip: tip,
			showAiActions: showActions,
		});
	},

	checkInWakeUp() {
		const now = new Date();
		const hours = now.getHours().toString().padStart(2, "0");
		const minutes = now.getMinutes().toString().padStart(2, "0");
		const wakeUpTime = `${hours}:${minutes}`;

		this.setData({
			hasCheckedIn: true,
			"checkInData.wakeUpTime": wakeUpTime,
		});

		// Save to storage
		wx.setStorageSync("lastWakeUpTime", wakeUpTime);

		wx.showToast({
			title: "起床打卡成功",
			icon: "success",
		});
	},

	checkInSleep() {
		const now = new Date();
		const hours = now.getHours().toString().padStart(2, "0");
		const minutes = now.getMinutes().toString().padStart(2, "0");
		const sleepTime = `${hours}:${minutes}`;

		this.setData({
			hasCheckedIn: true,
			"checkInData.sleepTime": sleepTime,
		});

		// Save to storage
		wx.setStorageSync("lastSleepTime", sleepTime);

		// Check if we should offer recovery mode
		const hoursNum = Number.parseInt(hours, 10);
		if (hoursNum >= 23 || hoursNum < 5) {
			setTimeout(() => {
				wx.showModal({
					title: "开启修复模式",
					content: "检测到您正在熬夜，要开启修复模式来改善身体状况吗？",
					confirmText: "开启",
					cancelText: "稍后再说",
					success: (res) => {
						if (res.confirm) {
							this.setData({
								currentMode: "recoveryMode",
							});
						}
					},
				});
			}, 1000);
		}

		wx.showToast({
			title: "睡觉打卡成功",
			icon: "success",
		});
	},

	acceptAiSuggestion() {
		this.setData({
			showAiActions: false,
		});

		wx.showToast({
			title: "感谢接受建议",
			icon: "success",
		});
	},

	rejectAiSuggestion() {
		this.setData({
			showAiActions: false,
		});

		wx.showToast({
			title: "稍后将再次提醒您",
			icon: "none",
		});
	},

	closeActivityTutorial() {
		this.setData({
			showActivityTutorial: false,
		});
	},

	finishActivityTutorial() {
		this.setData({
			showActivityTutorial: false,
		});

		wx.showToast({
			title: "做得很好！",
			icon: "success",
		});
	},

	// Recovery mode functions
	initRecoveryData() {
		// 默认修复清单
		const defaultChecklist = [
			{ text: "吃一顿修复型早餐(水煮蛋、蓝莓、全麦面包)", checked: false },
			{ text: "湿毛巾冷敷眼部或眼部按摩", checked: false },
			{ text: "20分钟黄金小睡", checked: false },
			{ text: "散步10分钟", checked: false },
			{ text: "今日远离咖啡因", checked: false },
			{ text: "保持充分水分摄入", checked: false },
			{ text: "不晚于22点睡觉", checked: false },
			{ text: "睡前1小时避免电子设备", checked: false },
		];

		// Load saved checklist data if exists
		const savedChecklist = wx.getStorageSync("recoveryChecklist");
		if (savedChecklist && savedChecklist.length > 0) {
			this.setData({
				recoveryChecklist: savedChecklist,
			});
		} else {
			this.setData({
				recoveryChecklist: defaultChecklist,
			});
		}

		// Calculate progress based on checked items
		this.calculateRecoveryProgress();
	},

	// Handle checklist item toggling
	toggleChecklistItem(e) {
		try {
			const index = Number.parseInt(e.currentTarget.dataset.index, 10);

			// Validate index
			if (
				Number.isNaN(index) ||
				index < 0 ||
				index >= this.data.recoveryChecklist.length
			) {
				wx.showToast({
					title: "操作失败，请稍后重试",
					icon: "none",
				});
				return;
			}

			const newChecklist = this.data.recoveryChecklist.map((item, idx) => {
				if (idx === index) {
					return { ...item, checked: !item.checked };
				}
				return item;
			});

			this.setData({
				recoveryChecklist: newChecklist,
			});

			// Save the updated checklist to storage
			wx.setStorageSync("recoveryChecklist", newChecklist);

			// Calculate and update progress
			this.calculateRecoveryProgress();

			if (newChecklist[index].checked) {
				wx.showToast({
					title: "完成一项修复活动！",
					icon: "success",
					duration: 1500,
				});
			}
		} catch (error) {
			console.error("Error in toggleChecklistItem:", error);
			wx.showToast({
				title: "发生错误，请重试",
				icon: "none",
			});
		}
	},

	// Calculate recovery progress based on checked items
	calculateRecoveryProgress() {
		const checklist = this.data.recoveryChecklist;
		const totalItems = checklist.length;
		const checkedItems = checklist.filter((item) => item.checked).length;

		// Calculate progress percentage
		const progress =
			totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

		// Update progress and completed tasks count
		this.setData({
			recoveryProgress: progress,
			completedRecoveryTasks: checkedItems,
		});

		// Generate appropriate message based on progress
		let message = "";
		if (progress === 0) {
			message = "修复刚刚开始，选择任务开始恢复吧！";
		} else if (progress < 30) {
			message = "修复刚刚开始，请继续坚持！";
		} else if (progress < 60) {
			message = "您已完成30%的修复，继续保持！";
		} else if (progress < 90) {
			message = "修复过半，您的身体状况正在好转！";
		} else if (progress < 100) {
			message = "修复即将完成，坚持一下就成功了！";
		} else {
			message = "修复完成！您的身体状况已显著改善！";
		}

		this.setData({
			recoveryMessage: message,
		});
	},

	drawProgressCircle() {
		const progress = this.data.recoveryProgress / 100;
		const ctx = wx.createCanvasContext("progressCanvas");

		// Draw background circle
		ctx.beginPath();
		ctx.arc(150, 150, 120, 0, 2 * Math.PI);
		ctx.setLineWidth(20);
		ctx.setStrokeStyle("#eee");
		ctx.stroke();

		// Draw progress arc
		ctx.beginPath();
		ctx.arc(150, 150, 120, -Math.PI / 2, progress * 2 * Math.PI - Math.PI / 2);
		ctx.setLineWidth(20);
		ctx.setStrokeStyle("#8cbdb6");
		ctx.stroke();

		ctx.draw();
	},

	generateRecoveryRecommendations() {
		// Mock recommendations based on different categories
		const recommendations = [
			{
				id: 1,
				title: "熬夜后的营养补充",
				image: "/images/nutrition.png",
			},
			{
				id: 2,
				title: "5分钟快速入睡法",
				image: "/images/quick_sleep.png",
			},
			{
				id: 3,
				title: "眼部疲劳修复按摩",
				image: "/images/eye_massage.png",
			},
			{
				id: 4,
				title: "改善睡眠质量的茶饮",
				image: "/images/sleep_tea.png",
			},
		];

		this.setData({
			recoveryRecommendations: recommendations,
		});
	},

	openRecommendation(e) {
		const id = e.currentTarget.dataset.id;

		// In a real app, navigate to detailed content
		wx.showToast({
			title: "正在加载推荐内容...",
			icon: "loading",
		});

		setTimeout(() => {
			// Mock navigation
			wx.navigateTo({
				url: `/pages/discovery/discovery?id=${id}&type=recovery`,
			});
		}, 1000);
	},
});
