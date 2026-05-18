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

// 生成详细答案的函数
function generateDetailedAnswer(question) {
  const { title, prompt } = question

  // 通用答案生成逻辑，基于标题关键词匹配
  if (title.includes('JVM') || title.includes('虚拟机') || title.includes('字节码') ||
      title.includes('程序计数器') || title.includes('堆') || title.includes('栈帧') ||
      title.includes('运行时数据区') || title.includes('Java') || title.includes('GC') ||
      title.includes('垃圾回收') || title.includes('类加载')) {
    return generateJVMAnswer(title, prompt)
  } else if (title.includes('并发') || title.includes('线程') || title.includes('锁') ||
             title.includes('synchronized') || title.includes('ReentrantLock') ||
             title.includes('volatile') || title.includes('CAS')) {
    return generateConcurrencyAnswer(title, prompt)
  } else if (title.includes('架构') || title.includes('设计') || title.includes('模式') ||
             title.includes('模块化') || title.includes('微服务') || title.includes('JIT') ||
             title.includes('逃逸分析') || title.includes('AOT') || title.includes('编译')) {
    return generateArchitectureAnswer(title, prompt)
  } else if (title.includes('数据库') || title.includes('MySQL') || title.includes('SQL') ||
             title.includes('索引') || title.includes('事务') || title.includes('隔离级别')) {
    return generateDatabaseAnswer(title, prompt)
  } else if (title.includes('网络') || title.includes('HTTP') || title.includes('TCP') ||
             title.includes('HTTPS') || title.includes('握手')) {
    return generateNetworkAnswer(title, prompt)
  } else if (title.includes('Spring') || title.includes('框架') || title.includes('依赖注入')) {
    return generateFrameworkAnswer(title, prompt)
  } else {
    return generateGeneralAnswer(title, prompt)
  }
}

function generateJVMAnswer(title, prompt) {
  const baseAnswer = `针对JVM相关问题：${title}\n\n详细解答：`

  if (title.includes('程序计数器')) {
    return `${baseAnswer}\n\n程序计数器（Program Counter Register）是JVM运行时数据区中一块较小的内存空间，它的作用是记录当前线程执行到的字节码指令地址。

**为什么必须线程私有？**
1. **线程切换恢复**：多线程环境下，CPU需要在不同线程间切换。当线程A被暂停时，程序计数器记录了线程A执行到的具体位置。当线程A重新获得CPU时间片时，可以从记录的位置继续执行，不会从头开始。

2. **避免线程干扰**：如果程序计数器是线程共享的，当线程A执行到某个字节码位置时，线程B切换过来会覆盖这个位置，导致线程A恢复时从错误的位置执行，造成程序行为不可预测。

3. **支持Java控制流**：程序计数器支持方法调用、分支跳转、循环、异常处理等控制流特性。

**${prompt}**
如果没有程序计数器，JVM将无法知道线程应该从哪里继续执行代码。线程切换时会丢失执行上下文，导致：
- 线程无法正确恢复执行，可能从错误位置开始执行
- 多线程程序行为变得不可预测
- 无法实现正常的控制流（条件分支、循环等）
- 程序可能出现死循环或异常终止`
  }

  if (title.includes('堆') && title.includes('方法区')) {
    return `${baseAnswer}\n\n**堆（Heap）适合存放的内容：**
- 对象实例：通过new关键字创建的所有对象实例
- 数组：所有类型的数组对象
- 特点：动态分配和回收，所有线程共享访问，是垃圾回收的主要区域

**方法区（元空间）适合存放的内容：**
- 类元数据：类的完整信息（类名、父类、接口、修饰符等）
- 常量池：字符串常量、数字常量、方法引用等
- 字段信息：类的字段声明信息
- 方法信息：方法的字节码、异常表等
- 类变量：static修饰的变量

**${prompt}**
**堆溢出场景（OutOfMemoryError: Java heap space）：**
- 内存泄漏：对象被意外持有强引用，无法被GC回收
- 大对象创建：一次性创建超大数组或对象
- 集合类无限增长：HashMap不断put但不清理

**方法区溢出场景（OutOfMemoryError: Metaspace）：**
- 动态类生成：使用CGLIB等工具大量生成代理类
- 字符串常量过多：intern()方法滥用导致常量池膨胀
- 第三方库版本冲突：相同类被重复加载`
  }

  if (title.includes('栈帧')) {
    return `${baseAnswer}\n\n栈帧（Stack Frame）是JVM虚拟机栈的基本单位，每当一个方法被调用时，JVM就会创建一个栈帧来存储该方法的执行信息。

**栈帧的主要组成部分：**

1. **局部变量表（Local Variables）**
   - 存储方法参数和方法内部定义的局部变量
   - 包括基本类型、对象引用和returnAddress类型
   - 变量槽（Slot）为最小单位，long/double占用两个Slot

2. **操作数栈（Operand Stack）**
   - 作为方法执行的工作区，存放运算过程中的临时数据
   - 字节码指令从局部变量表取数据，存入操作数栈

3. **动态链接（Dynamic Linking）**
   - 指向运行时常量池中该栈帧所属方法的引用
   - 支持方法调用过程中的动态链接

4. **方法返回地址（Return Address）**
   - 存储调用该方法时的程序计数器值
   - 方法正常退出时，PC值恢复到返回地址

**${prompt}**
以方法调用result = add(1, 2)为例：
1. JVM检查方法访问权限，为add方法创建新栈帧
2. 将参数1和2压入新栈帧局部变量表
3. 字节码指令从局部变量表加载参数到操作数栈
4. 执行加法运算，结果暂存到操作数栈
5. 执行return指令，将返回值压入调用者栈帧的操作数栈
6. 弹出当前栈帧，恢复调用者的程序计数器`
  }

  if (title.includes('运行时数据区')) {
    return `${baseAnswer}\n\nJVM运行时数据区按照线程私有和线程共享分为以下主要部分：

**线程私有区域：**
1. **程序计数器**：记录当前线程执行到的字节码指令地址
2. **虚拟机栈**：描述Java方法执行的内存模型，每个方法执行时创建一个栈帧
3. **本地方法栈**：为JVM使用的native方法服务

**线程共享区域：**
1. **堆**：JVM最大内存区域，存放所有对象实例和数组
2. **方法区**：存储类信息、常量、静态变量等（JDK 8+使用元空间实现）
3. **直接内存**：通过NIO的DirectByteBuffer分配

**${prompt}**
- **线程私有**：程序计数器、虚拟机栈、本地方法栈
- **线程共享**：堆、方法区、直接内存

这种划分既保证了线程安全，又提高了内存利用效率。`
  }

  if (title.includes('一次编写，到处运行') || title.includes('Write Once, Run Anywhere')) {
    return `${baseAnswer}\n\nJava的「Write Once, Run Anywhere」特性通过JVM和字节码技术实现，将编译和运行分离。

**从源码到机器指令的完整路径：**

1. **源码编写**：使用Java语言编写.java文件
2. **编译阶段**：javac编译器将.java编译成.class字节码文件
3. **类加载阶段**：ClassLoader将.class文件加载到内存
4. **运行时执行**：JVM解释器/JIT编译器将字节码转换为平台特定机器码

**${prompt}**
源码 → javac编译 → .class字节码 → ClassLoader加载 → 字节码验证 → JVM解释器/JIT编译器 → 平台特定机器码 → CPU执行

这种设计虽然增加运行时开销，但提供了卓越的跨平台能力和安全性。`
  }

  return `${baseAnswer}\n\n需要根据具体JVM实现和版本来分析。${prompt ? `\n\n${prompt}` : ''}`
}

function generateConcurrencyAnswer(title, prompt) {
  const baseAnswer = `针对并发编程问题：${title}\n\n详细解答：`

  if (title.includes('synchronized') || title.includes('ReentrantLock')) {
    return `${baseAnswer}\n\nJava中synchronized关键字和ReentrantLock是两种主要的锁实现机制。

**synchronized关键字的特点：**
- 语法层面：Java语言内置的关键字，无需显式获取和释放锁
- 自动管理：JVM自动管理锁的获取和释放
- 不可中断：一旦获取锁，线程无法被中断
- 条件等待：只能通过wait()/notify()机制

**ReentrantLock的特点：**
- API层面：java.util.concurrent.locks包中的类
- 手动管理：需要显式调用lock()和unlock()
- 可中断：支持lockInterruptibly()方法允许线程中断
- 条件等待：支持多个Condition对象，实现更灵活的等待通知
- 公平性：可以选择公平锁或非公平锁
- 超时机制：支持tryLock()和tryLock(long, TimeUnit)

**${prompt}**
选择标准：
- 简单场景：优先使用synchronized，代码简洁
- 复杂场景：需要可中断、超时、公平性时使用ReentrantLock
- 性能敏感：考虑StampedLock的乐观读策略

两种锁实现都是可重入的，都支持同一个线程多次获取同一把锁。`
  }

  return `${baseAnswer}\n\n并发编程需要考虑线程安全、性能和正确性。${prompt ? `\n\n${prompt}` : ''}`
}

function generateArchitectureAnswer(title, prompt) {
  const baseAnswer = `针对系统架构问题：${title}\n\n详细解答：`

  if (title.includes('模块化单体') && title.includes('微服务')) {
    return `${baseAnswer}\n\n模块化单体和微服务是两种不同的系统架构模式。

**模块化单体架构特点：**
- 部署方式：整个应用作为一个单独的部署单元
- 模块划分：在代码层面进行模块化组织
- 技术栈：通常使用单一技术栈
- 数据库：通常共享同一个数据库
- 事务管理：可以使用本地事务

**微服务架构特点：**
- 部署方式：每个服务独立部署、扩展和升级
- 服务划分：按业务领域进行服务拆分
- 技术栈：每个服务可以选择最适合的技术栈
- 数据库：每个服务可以有独立的数据库
- 事务管理：需要分布式事务或Saga模式

**核心区别：**
1. 边界划分：模块化单体是代码级别的边界，微服务是服务级别的边界
2. 部署独立性：微服务可以独立部署，模块化单体需要整体部署
3. 技术异构性：微服务支持不同服务使用不同技术栈

**${prompt}**
选择标准：
- 小型团队/项目：模块化单体更简单，开发效率高
- 大型复杂系统：微服务提供更好的可扩展性和技术灵活性
- 业务复杂度：业务边界清晰时适合微服务

两种架构没有绝对优劣，需要根据具体业务场景和团队能力选择。`
  }

  if (title.includes('JIT') || title.includes('逃逸分析') || title.includes('AOT')) {
    return `${baseAnswer}\n\nJIT、逃逸分析和AOT是JVM中三种不同的编译优化技术。

**JIT（Just-In-Time）编译：**
- 工作原理：在程序运行时将热点字节码编译成本地机器码
- 触发条件：方法调用次数超过阈值
- 优点：充分利用运行时信息，优化效果好

**逃逸分析（Escape Analysis）：**
- 分析对象：对象的作用域和生命周期
- 优化手段：栈上分配、锁消除、标量替换
- 目的：减少GC压力，提高性能

**AOT（Ahead-Of-Time）编译：**
- 工作原理：在程序运行前将字节码预编译成机器码
- 工具支持：GraalVM的native-image工具
- 优点：启动快，内存占用少

**${prompt}**
- JIT适合：长时间运行的服务器应用
- 逃逸分析：作为JIT编译的一部分，自动进行对象优化
- AOT适合：启动频繁、运行时间短的应用，如CLI工具`
  }

  return `${baseAnswer}\n\n架构设计需要权衡各种因素。${prompt ? `\n\n${prompt}` : ''}`
}

function generateDatabaseAnswer(title, prompt) {
  const baseAnswer = `针对数据库问题：${title}\n\n详细解答：`

  if (title.includes('索引') && title.includes('最左前缀')) {
    return `${baseAnswer}\n\n索引最左前缀原则是MySQL等数据库在设计复合索引时的重要原则。

**最左前缀原则的核心：**
- 复合索引的字段顺序很重要
- 查询时必须按照索引的字段顺序从左到右匹配
- 如果跳过某个字段，后面的字段将无法使用索引

**例如：** 复合索引(idx_name_age_city)
- ✅ 可以使用：WHERE name = '张三'
- ✅ 可以使用：WHERE name = '张三' AND age = 20
- ✅ 可以使用：WHERE name = '张三' AND age = 20 AND city = '北京'
- ❌ 不可以使用：WHERE age = 20（跳过了name）
- ❌ 不可以使用：WHERE city = '北京'（跳过了name和age）

**${prompt}**
联合索引如何失效：
1. **不遵循最左前缀**：查询条件跳过索引前面的字段
2. **范围查询后失效**：使用范围查询（如>、<、between）后，后面的字段无法使用索引
3. **函数操作**：对索引字段使用函数，会导致索引失效
4. **类型转换**：隐式类型转换会导致索引失效
5. **模糊查询**：以%开头的like查询无法使用索引

**优化建议：**
- 合理设计复合索引的字段顺序
- 避免在索引字段上使用函数或类型转换
- 考虑索引覆盖，减少回表查询`
  }

  if (title.includes('隔离级别')) {
    return `${baseAnswer}\n\n数据库事务的四个隔离级别从低到高分别是：

1. **读未提交（Read Uncommitted）**
   - 允许读取未提交的数据
   - 可能出现脏读、不可重复读、幻读

2. **读已提交（Read Committed）**
   - 只允许读取已提交的数据
   - 避免脏读，但可能出现不可重复读、幻读

3. **可重复读（Repeatable Read）**
   - 保证在同一事务中多次读取同一数据结果一致
   - 避免脏读、不可重复读，但可能出现幻读
   - MySQL InnoDB默认隔离级别

4. **串行化（Serializable）**
   - 最高的隔离级别，完全避免上述所有问题
   - 通过强制事务串行执行实现，但性能最差

**${prompt}**
MySQL InnoDB 默认使用可重复读隔离级别，通过MVCC（多版本并发控制）和Next-Key锁机制，在可重复读级别下避免了幻读问题。`
  }

  if (title.includes('事务') && title.includes('ACID')) {
    return `${baseAnswer}\n\n事务ACID特性是数据库事务正确执行的四个基本要求：

**A（Atomicity）- 原子性**
- 事务是一个不可分割的工作单位
- 事务中的操作要么全部成功，要么全部失败
- 通过undo log实现，回滚时撤销所有已完成的操作

**C（Consistency）- 一致性**
- 事务必须使数据库从一个一致性状态变到另一个一致性状态
- 确保数据的完整性约束不被破坏
- 依赖原子性、隔离性和持久性来保证

**I（Isolation）- 隔离性**
- 并发执行的事务之间不能相互干扰
- 通过锁机制和MVCC实现不同隔离级别
- 避免脏读、不可重复读、幻读等问题

**D（Durability）- 持久性**
- 一旦事务提交，其结果就是永久性的
- 即使系统发生故障，数据也不会丢失
- 通过redo log实现，系统恢复时重新执行已提交的事务

**${prompt}**
一致性在业务里常体现为：
- 数据完整性约束（如外键约束、检查约束）
- 业务规则的保持（如账户余额不能为负数）
- 跨表数据的一致性（如转账操作的原子性）
- 通过数据库约束、触发器、应用层校验等多重保障`
  }

  return `${baseAnswer}\n\n涉及数据存储、查询优化和事务管理等核心概念。${prompt ? `\n\n${prompt}` : ''}`
}

function generateNetworkAnswer(title, prompt) {
  const baseAnswer = `针对网络编程问题：${title}\n\n详细解答：`

  if (title.includes('HTTPS') && title.includes('握手')) {
    return `${baseAnswer}\n\nHTTPS握手过程是建立安全通信的关键，通过非对称加密和对称加密的结合，确保通信的安全性。

**HTTPS握手大致解决了以下问题：**

1. **身份验证**：确认服务器的真实身份，防止中间人攻击
2. **密钥协商**：安全地交换对称加密密钥
3. **数据加密**：确保传输数据的机密性
4. **数据完整性**：防止数据被篡改
5. **前向安全性**：即使私钥泄露，之前的通信仍安全

**完整的握手过程：**

1. **Client Hello**：客户端发送支持的协议版本、加密算法、随机数
2. **Server Hello**：服务器选择加密算法，返回证书和服务器随机数
3. **证书验证**：客户端验证服务器证书的合法性
4. **密钥交换**：客户端生成pre-master secret，用服务器公钥加密发送
5. **生成会话密钥**：双方使用随机数和pre-master secret生成对称密钥
6. **握手完成**：后续通信使用对称加密

**${prompt}**
证书扮演什么角色：
- **身份证明**：由CA签发的数字证书证明服务器身份
- **公钥分发**：安全地传递服务器的公钥
- **信任链建立**：通过CA根证书建立信任链
- **加密支持**：支持密钥交换和数字签名

HTTPS通过复杂的握手过程，确保了通信的安全性，但也带来了额外的性能开销。`
  }

  return `${baseAnswer}\n\n涉及协议设计、性能优化和安全考虑。${prompt ? `\n\n${prompt}` : ''}`
}

function generateFrameworkAnswer(title, prompt) {
  return `针对框架相关问题：${title}\n\n详细解答：\n\n涉及设计模式、依赖注入和组件生命周期管理。${prompt ? `\n\n${prompt}` : ''}`
}

function generateGeneralAnswer(title, prompt) {
  return `技术问题：${title}\n\n详细解答：\n\n需要根据具体技术栈和应用场景进行分析。${prompt ? `\n\n${prompt}` : ''}`
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