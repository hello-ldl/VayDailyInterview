import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const CHUNK_DIR = path.join(ROOT, 'public', 'questions', 'chunks')

// 读取所有chunk文件
function readAllChunks() {
  const files = fs.readdirSync(CHUNK_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()

  const allQuestions = []

  for (const file of files) {
    const filePath = path.join(CHUNK_DIR, file)
    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)
    allQuestions.push(...data.questions)
  }

  return allQuestions
}

// 模拟生成详细答案的函数
function generateDetailedAnswer(question) {
  const { title, prompt, tags, id } = question

  // 基于题目ID和内容生成详细答案
  // 这里提供更详细的答案生成逻辑

  let answer = ''

  // 根据题目标题关键词匹配生成答案
  if (title.includes('JVM') || title.includes('虚拟机') || title.includes('字节码')) {
    answer = generateJVMAnswer(title, prompt)
  } else if (title.includes('并发') || title.includes('线程') || title.includes('锁') || title.includes('synchronized')) {
    answer = generateConcurrencyAnswer(title, prompt)
  } else if (title.includes('架构') || title.includes('设计') || title.includes('模式')) {
    answer = generateArchitectureAnswer(title, prompt)
  } else if (title.includes('数据库') || title.includes('MySQL') || title.includes('SQL')) {
    answer = generateDatabaseAnswer(title, prompt)
  } else if (title.includes('网络') || title.includes('HTTP') || title.includes('TCP')) {
    answer = generateNetworkAnswer(title, prompt)
  } else if (title.includes('Spring') || title.includes('框架')) {
    answer = generateFrameworkAnswer(title, prompt)
  } else {
    answer = generateGeneralAnswer(title, prompt)
  }

  return answer
}

function generateJVMAnswer(title, prompt) {
  const answers = {
    '程序计数器为什么要线程私有？': `程序计数器（Program Counter Register）是JVM运行时数据区中一块较小的内存空间，它的作用是记录当前线程执行到的字节码指令地址。

**为什么必须线程私有？**
1. **线程切换恢复**：多线程环境下，CPU需要在不同线程间切换。当线程A被暂停时，程序计数器记录了线程A执行到的具体位置。当线程A重新获得CPU时间片时，可以从记录的位置继续执行，不会从头开始。

2. **避免线程干扰**：如果程序计数器是线程共享的，当线程A执行到某个字节码位置时，线程B切换过来会覆盖这个位置，导致线程A恢复时从错误的位置执行，造成程序行为不可预测。

3. **支持Java控制流**：程序计数器支持方法调用、分支跳转、循环、异常处理等控制流特性。通过记录下一条要执行的指令地址，实现复杂的程序逻辑。

**${prompt}**
如果没有程序计数器，JVM将无法知道线程应该从哪里继续执行代码。线程切换时会丢失执行上下文，导致：
- 线程无法正确恢复，可能从错误位置开始执行
- 多线程程序行为变得不可预测
- 无法实现正常的控制流（条件分支、循环等）
- 程序可能出现死循环或异常终止

程序计数器虽然只占用很小的内存空间（通常保存一个returnAddress或native指针），但它是JVM实现多线程和复杂控制流的基础设施。`,

    '堆与方法区（元空间）分别更适合存什么？': `JVM运行时数据区中，堆和方法区（元空间）承担着不同的内存管理职责。

**堆（Heap）适合存放的内容：**
- **对象实例**：通过new关键字创建的所有对象实例
- **数组**：所有类型的数组对象
- **特点**：
  - 动态分配和回收
  - 所有线程共享访问
  - 是垃圾回收的主要区域
  - 物理上可以不连续，逻辑上连续

**方法区（元空间）适合存放的内容：**
- **类元数据**：类的完整信息（类名、父类、接口、修饰符等）
- **常量池**：字符串常量、数字常量、方法引用等
- **字段信息**：类的字段声明信息
- **方法信息**：方法的字节码、异常表等
- **类变量**：static修饰的变量

**${prompt}**
**堆溢出场景（OutOfMemoryError: Java heap space）：**
- 内存泄漏：对象被意外持有强引用，无法被GC回收
- 大对象创建：一次性创建超大数组或对象
- 集合类无限增长：HashMap不断put但不清理
- 递归调用过深：导致栈帧过多间接占用堆空间

**方法区溢出场景（OutOfMemoryError: Metaspace）：**
- 动态类生成：使用CGLIB等工具大量生成代理类
- JSP应用：大量JSP文件编译成Class文件
- 字符串常量过多：intern()方法滥用导致常量池膨胀
- 第三方库版本冲突：相同类被重复加载

**调优建议：**
- 堆空间：-Xmx（最大堆）和-Xms（初始堆）
- 元空间：-XX:MaxMetaspaceSize限制元空间大小`,

    'Java 栈帧里一般包含哪些东西？': `栈帧（Stack Frame）是JVM虚拟机栈的基本单位，每当一个方法被调用时，JVM就会创建一个栈帧来存储该方法的执行信息。

**栈帧的主要组成部分：**

1. **局部变量表（Local Variables）**
   - 存储方法参数和方法内部定义的局部变量
   - 包括基本类型、对象引用和returnAddress类型
   - 变量槽（Slot）为最小单位，long/double占用两个Slot
   - 索引从0开始，第0个Slot通常是this引用（实例方法）

2. **操作数栈（Operand Stack）**
   - 作为方法执行的工作区，存放运算过程中的临时数据
   - 字节码指令从局部变量表或对象字段取数据，存入操作数栈
   - 运算完成后将结果存回局部变量表或推送到调用者操作数栈

3. **动态链接（Dynamic Linking）**
   - 指向运行时常量池中该栈帧所属方法的引用
   - 支持方法调用过程中的动态链接（虚方法分派、接口方法调用）
   - 为运行时方法绑定提供支持

4. **方法返回地址（Return Address）**
   - 存储调用该方法时的程序计数器值
   - 方法正常退出时，PC值恢复到返回地址
   - 异常退出时，通过异常处理表确定返回地址

**${prompt}**
以方法调用result = add(1, 2)为例：

1. **调用准备**：
   - JVM检查方法访问权限
   - 为add方法创建新栈帧
   - 将参数1和2压入新栈帧局部变量表

2. **方法执行**：
   - 字节码指令从局部变量表加载参数到操作数栈
   - 执行加法运算，结果暂存到操作数栈
   - 运算结果写回局部变量表或作为返回值

3. **方法返回**：
   - 执行return指令，将返回值压入调用者栈帧的操作数栈
   - 弹出当前栈帧，恢复调用者的程序计数器
   - 继续执行调用者的后续指令

栈帧的设计支持了JVM的递归调用、异常处理和垃圾回收等重要特性。`,

    '请简述 JVM 运行时数据区的主要划分。': `JVM运行时数据区是JVM执行Java程序时管理的内存区域，按照线程私有和线程共享分为以下主要部分：

**线程私有区域：**

1. **程序计数器（Program Counter Register）**
   - 记录当前线程执行到的字节码指令地址
   - 线程切换时保存和恢复执行位置
   - 唯一不会抛出OutOfMemoryError的区域
   - native方法执行时值为undefined

2. **虚拟机栈（VM Stack）**
   - 描述Java方法执行的内存模型
   - 每个方法执行时创建一个栈帧
   - 存储局部变量表、操作数栈、动态链接、方法出口等
   - 可能抛出StackOverflowError或OutOfMemoryError

3. **本地方法栈（Native Method Stack）**
   - 为JVM使用的native方法服务
   - HotSpot虚拟机将虚拟机栈和本地方法栈合二为一

**线程共享区域：**

1. **堆（Heap）**
   - JVM最大内存区域，存放所有对象实例和数组
   - 被所有线程共享，是垃圾回收的主要区域
   - 可能抛出OutOfMemoryError: Java heap space

2. **方法区（Method Area）**
   - 存储类信息、常量、静态变量等
   - JDK 8+使用元空间实现，不在JVM堆中
   - 包含运行时常量池
   - 可能抛出OutOfMemoryError: Metaspace

3. **直接内存（Direct Memory）**
   - 不是JVM运行时数据区的一部分
   - 通过NIO的DirectByteBuffer分配
   - 受本机内存限制

**${prompt}**
- **线程私有**：程序计数器、虚拟机栈、本地方法栈
- **线程共享**：堆、方法区、直接内存

这种划分既保证了线程安全，又提高了内存利用效率。`,

    'Java 如何实现「一次编写，到处运行」？': `Java的「Write Once, Run Anywhere」特性通过JVM和字节码技术实现，将编译和运行分离。

**从源码到机器指令的完整路径：**

1. **源码编写**：使用Java语言编写.java文件

2. **编译阶段**：
   - javac编译器将.java编译成.class字节码文件
   - 字节码是JVM定义的中间代码格式
   - 包含完整的程序逻辑和类型信息

3. **类加载阶段**：
   - ClassLoader将.class文件加载到内存
   - 经过加载、验证、准备、解析、初始化五个阶段
   - 验证字节码正确性，确保JVM安全

4. **运行时执行**：
   - **解释执行**：字节码解释器逐条翻译成机器码
   - **JIT编译**：热点代码编译成本地机器码
   - **AOT编译**：预编译技术（如GraalVM）

**${prompt}**
源码 → javac编译 → .class字节码 → ClassLoader加载 → 字节码验证 → JVM解释器/JIT编译器 → 平台特定机器码 → CPU执行

这种设计虽然增加运行时开销，但提供了卓越的跨平台能力和安全性。`
  }

  return answers[title] || `针对问题"${title}"的详细解答需要根据具体技术细节来分析。${prompt ? `\n\n补充问题：${prompt}` : ''}`
}

function generateConcurrencyAnswer(title, prompt) {
  const answers = {
    'synchronized 与 ReentrantLock 与 不同锁实现 的区别是什么？': `Java中synchronized关键字和ReentrantLock是两种主要的锁实现机制，各有特点和适用场景。

**synchronized关键字的特点：**
- **语法层面**：Java语言内置的关键字，无需显式获取和释放锁
- **自动管理**：JVM自动管理锁的获取和释放
- **不可中断**：一旦获取锁，线程无法被中断
- **条件等待**：只能通过wait()/notify()机制
- **锁升级**：支持无锁→偏向锁→轻量级锁→重量级锁的升级

**ReentrantLock的特点：**
- **API层面**：java.util.concurrent.locks包中的类
- **手动管理**：需要显式调用lock()和unlock()
- **可中断**：支持lockInterruptibly()方法允许线程中断
- **条件等待**：支持多个Condition对象，实现更灵活的等待通知
- **公平性**：可以选择公平锁或非公平锁
- **超时机制**：支持tryLock()和tryLock(long, TimeUnit)

**其他锁实现对比：**
- **ReadWriteLock**：读写分离，多个读线程可以同时访问
- **StampedLock**：基于戳记的锁，支持乐观读
- **Semaphore**：信号量，控制同时访问的线程数
- **CountDownLatch**：倒计时门栓，等待多个线程完成
- **CyclicBarrier**：循环屏障，等待多个线程到达同步点

**${prompt}**
选择标准：
- **简单场景**：优先使用synchronized，代码简洁
- **复杂场景**：需要可中断、超时、公平性时使用ReentrantLock
- **读多写少**：使用ReadWriteLock提高并发性能
- **性能敏感**：考虑StampedLock的乐观读策略

两种锁实现都是可重入的，都支持同一个线程多次获取同一把锁。`
  }

  return answers[title] || `并发编程问题"${title}"需要考虑线程安全、性能和正确性。${prompt ? `\n\n补充问题：${prompt}` : ''}`
}

function generateArchitectureAnswer(title, prompt) {
  const answers = {
    '模块化单体 与 微服务 的区别是什么？': `模块化单体和微服务是两种不同的系统架构模式，各有优缺点和适用场景。

**模块化单体架构特点：**
- **部署方式**：整个应用作为一个单独的部署单元
- **模块划分**：在代码层面进行模块化组织
- **技术栈**：通常使用单一技术栈
- **数据库**：通常共享同一个数据库
- **事务管理**：可以使用本地事务
- **通信方式**：模块间通过方法调用或共享内存通信

**微服务架构特点：**
- **部署方式**：每个服务独立部署、扩展和升级
- **服务划分**：按业务领域进行服务拆分
- **技术栈**：每个服务可以选择最适合的技术栈
- **数据库**：每个服务可以有独立的数据库
- **事务管理**：需要分布式事务或Saga模式
- **通信方式**：通过HTTP、消息队列等网络通信

**核心区别：**
1. **边界划分**：模块化单体是代码级别的边界，微服务是服务级别的边界
2. **部署独立性**：微服务可以独立部署，模块化单体需要整体部署
3. **技术异构性**：微服务支持不同服务使用不同技术栈
4. **数据独立性**：微服务可以有独立的数据存储
5. **团队组织**：微服务通常对应独立的团队负责

**${prompt}**
选择标准：
- **小型团队/项目**：模块化单体更简单，开发效率高
- **大型复杂系统**：微服务提供更好的可扩展性和技术灵活性
- **业务复杂度**：业务边界清晰时适合微服务
- **基础设施成熟度**：需要强大的DevOps支持微服务

两种架构没有绝对优劣，需要根据具体业务场景和团队能力选择。`,

    '模块化单体 的常见误区有哪些？': `模块化单体架构在实践中容易陷入一些常见的误区，导致架构设计失败。

**常见误区：**

1. **过度模块化**
   - 错误观点：模块划分得越细越好
   - 实际问题：过度模块化增加系统复杂度，模块间通信成本上升
   - 正确做法：基于业务边界和团队规模进行合理划分

2. **忽略数据库共享**
   - 错误观点：只要代码模块化，数据库可以随意共享
   - 实际问题：数据库共享导致模块间耦合，难以独立演进
   - 正确做法：评估模块间的数据库依赖关系

3. **技术栈单一化**
   - 错误观点：模块化单体就应该使用统一技术栈
   - 实际问题：限制了技术选型的灵活性
   - 正确做法：在模块内部可以有技术栈的差异

4. **部署单元过大**
   - 错误观点：单体应用就不能拆分部署
   - 实际问题：影响部署效率和系统可用性
   - 正确做法：通过虚拟化或容器化实现部分模块的独立部署

5. **忽略团队沟通成本**
   - 错误观点：模块化后团队可以完全独立工作
   - 实际问题：跨模块的需求需要频繁沟通
   - 正确做法：建立有效的跨模块沟通机制

**${prompt}**
实际应用中要避免：
- 模块间过度耦合导致的"分布式单体"
- 忽略业务演进导致的模块边界不清晰
- 缺乏有效的模块间接口管理
- 部署和运维策略的缺失

模块化单体架构需要平衡模块化带来的好处和复杂性增加的成本。`,

    '何时应该优先使用 模块化单体？': `模块化单体架构在某些场景下比微服务更合适，需要根据具体情况选择。

**适合使用模块化单体的场景：**

1. **项目早期阶段**
   - 业务需求还不稳定，需要快速迭代
   - 团队规模较小，沟通成本低
   - 不确定业务边界和拆分方案

2. **业务复杂度适中**
   - 系统功能相对简单，模块间依赖清晰
   - 业务领域边界相对稳定
   - 不需要极致的性能和扩展性

3. **团队技术栈统一**
   - 团队成员技术栈相对统一
   - 没有强烈的技术异构需求
   - 运维和部署能力相对有限

4. **资源和成本考虑**
   - 基础设施资源有限
   - 运维成本需要控制
   - 开发周期要求较短

5. **数据一致性要求高**
   - 业务需要强一致性保证
   - 分布式事务复杂度过高
   - 业务流程需要原子性操作

**${prompt}**
模块化单体最适合：
- 快速验证业务想法的MVP阶段
- 业务复杂度不高，需要快速上线的项目
- 团队规模不大，沟通协作高效的场景
- 对数据一致性要求极高的核心业务系统

随着业务发展，可以从模块化单体逐步演进到微服务架构。`,

    '模块化单体 的核心是什么？': `模块化单体的核心在于通过合理的架构设计，在保持单体部署优势的同时获得模块化的可维护性。

**模块化单体的核心要素：**

1. **清晰的模块边界**
   - 基于业务领域进行模块划分
   - 每个模块职责单一，接口清晰
   - 模块间通过定义良好的接口通信

2. **代码组织结构**
   - 按模块进行代码物理分离
   - 建立模块间的依赖关系管理
   - 避免循环依赖和过度耦合

3. **数据存储策略**
   - 评估模块间的数据共享需求
   - 设计合理的数据库表结构
   - 考虑数据迁移和版本兼容性

4. **部署和运维策略**
   - 支持模块级别的独立部署
   - 建立有效的监控和日志体系
   - 制定回滚和故障恢复策略

5. **团队协作机制**
   - 建立跨模块的需求评审机制
   - 制定接口变更的沟通流程
   - 建立共享组件的管理机制

**${prompt}**
模块化单体的核心是平衡单体应用的简单性和模块化的可维护性。通过合理的架构设计，既保持了部署和运维的便利性，又获得了模块化的开发效率和系统稳定性。

这种架构模式特别适合业务复杂度适中、团队规模不大、需要快速交付的场景。`,

    'JIT 与逃逸分析 与 AOT 编译 的区别是什么？': `JIT、逃逸分析和AOT是JVM中三种不同的编译优化技术，各有特点和应用场景。

**JIT（Just-In-Time）编译：**
- **工作原理**：在程序运行时将热点字节码编译成本地机器码
- **触发条件**：方法调用次数或循环回边次数超过阈值
- **优化策略**：基于运行时 profiling 信息进行优化
- **分层编译**：解释执行 → C1编译 → C2编译
- **优点**：充分利用运行时信息，优化效果好
- **缺点**：编译时间开销，占用额外内存

**逃逸分析（Escape Analysis）：**
- **分析对象**：对象的作用域和生命周期
- **优化手段**：
  - **栈上分配**：对象不逃逸时在栈上分配，避免GC
  - **锁消除**：同步块内的对象不逃逸时消除锁
  - **标量替换**：对象拆分为基本类型进行优化
- **JVM参数**：-XX:+DoEscapeAnalysis启用逃逸分析

**AOT（Ahead-Of-Time）编译：**
- **工作原理**：在程序运行前将字节码预编译成机器码
- **工具支持**：GraalVM的native-image工具
- **应用场景**：启动性能敏感的应用、云原生应用
- **优点**：启动快，内存占用少，适合容器化部署
- **缺点**：编译时间长，调试困难，框架兼容性限制

**${prompt}**
- **JIT适合**：长时间运行的服务器应用，需要充分利用运行时优化
- **逃逸分析**：作为JIT编译的一部分，自动进行对象优化
- **AOT适合**：启动频繁、运行时间短的应用，如CLI工具、微服务

三种技术可以结合使用，发挥各自优势。`
  }

  return answers[title] || `架构设计问题"${title}"需要权衡各种因素。${prompt ? `\n\n补充问题：${prompt}` : ''}`
}

function generateDatabaseAnswer(title, prompt) {
  return `数据库相关问题"${title}"涉及数据存储、查询优化和事务管理等核心概念。${prompt ? `\n\n补充问题：${prompt}` : ''}`
}

function generateNetworkAnswer(title, prompt) {
  return `网络编程问题"${title}"涉及协议设计、性能优化和安全考虑。${prompt ? `\n\n补充问题：${prompt}` : ''}`
}

function generateFrameworkAnswer(title, prompt) {
  return `框架相关问题"${title}"涉及设计模式、依赖注入和组件生命周期管理。${prompt ? `\n\n补充问题：${prompt}` : ''}`
}

function generateGeneralAnswer(title, prompt) {
  return `技术问题"${title}"需要根据具体技术栈和应用场景进行分析。${prompt ? `\n\n补充问题：${prompt}` : ''}`
}

// 更新所有chunk文件
function updateAllChunks() {
  const files = fs.readdirSync(CHUNK_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()

  for (const file of files) {
    const filePath = path.join(CHUNK_DIR, file)
    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)

    // 更新每个问题的答案
    data.questions = data.questions.map(question => ({
      ...question,
      answer: generateDetailedAnswer(question)
    }))

    // 写回文件
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    console.log(`Updated ${file}`)
  }
}

// 主函数
function main() {
  console.log('Reading all questions...')
  const questions = readAllChunks()
  console.log(`Found ${questions.length} questions`)

  console.log('Updating answers...')
  updateAllChunks()

  console.log('Done!')
}

main()