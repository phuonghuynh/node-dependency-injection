import Definition from './Definition'
import PassConfig from './PassConfig'
import Compiler from './Compiler'
import CompilerPass from './CompilerPass'
import InstanceManager from './InstanceManager'
import DefinitionNotFoundException from './Exception/DefinitionNotFoundException'
import LoadMethodNotFoundException from './Exception/LoadMethodNotFoundException'
import LoggerWarnMethodNotFoundException from './Exception/LoggerWarnMethodNotFoundException'
import WrongDefinitionException from './Exception/WrongDefinitionException'
import FrozenContainerException from './Exception/FrozenContainerException'
import { waitUntil } from 'async-wait-until'

class ContainerBuilder {
  /**
   * @param {boolean} containerReferenceAsService
   * @param {String} defaultDir
   */
  constructor (containerReferenceAsService = false, defaultDir = null) {
    this._definitions = new Map()
    this._parameters = new Map()
    this._alias = new Map()
    this._container = new Map()
    this._frozen = false
    this._compilerPass = new CompilerPass(this)
    this._extensions = []
    this._logger = console
    this._instanceManager = undefined
    this._containerReferenceAsService = containerReferenceAsService
    this._defaultDir = defaultDir
  }

  /**
   * @returns {String}
   */
  get defaultDir () {
    return this._defaultDir
  }

  /**
   * @returns {boolean}
   */
  get containerReferenceAsService () {
    return this._containerReferenceAsService
  }

  /**
   * @returns {Map}
   */
  get definitions () {
    return this._definitions
  }

  /**
   * @returns {boolean}
   */
  get frozen () {
    return this._frozen
  }

  /**
   * @param {boolean} value
   */
  set frozen (value) {
    this._frozen = value
  }

  /**
   * @return {InstanceManager}
   */
  get instanceManager () {
    if (!this._instanceManager) {
      this._instanceManager = new InstanceManager(this, this._definitions,
        this._alias)
    }
    return this._instanceManager
  }

  /**
   * @returns {Array}
   */
  get extensions () {
    return this._extensions
  }

  /**
   * @returns {Console|*}
   */
  get logger () {
    return this._logger
  }

  /**
   * @param {Console|*} value
   */
  set logger (value) {
    if (typeof value.warn !== 'function') {
      throw new LoggerWarnMethodNotFoundException()
    }
    this._logger = value
  }

  /**
   * @return {Map}
   */
  get services () {
    return this._container
  }

  /**
   * @param {string} id
   * @param {*|null} object
   * @param {Array} args
   * @returns {Definition}
   */
  register (id, object = null, args = []) {
    if (!this.frozen) {
      const definition = new Definition()
      definition.Object = object
      definition.args = args

      if (!object) {
        definition.synthetic = true
      }

      return this.setDefinition(id, definition)
    }

    throw new FrozenContainerException()
  }

  /**
   * @param {string} id
   */
  get (id) {
    return this.instanceManager.getInstance(id)
  }

  compile () {
    new Compiler(this).run()
  }

  /**
   * @param {*} compilerPass
   * @param {string} type
   * @param {number} priority
   */
  addCompilerPass (
    compilerPass, type = PassConfig.TYPE_BEFORE_OPTIMIZATION, priority = 0) {
    this._compilerPass.register(compilerPass, type, priority)
  }

  /**
   * @param {string} alias
   * @param {string} id
   */
  setAlias (alias, id) {
    this._alias.set(alias, id)
  }

  /**
   * @param {string} id
   * @param {Definition} definition
   * @returns {Definition}
   */
  setDefinition (id, definition) {
    if (definition instanceof Definition) {
      if (this._definitions.has(id) && !definition.decoratedService) { // do not allow register same IDs
        return
      }

      this._definitions.set(id, definition)

      return definition
    }

    throw new WrongDefinitionException()
  }

  /**
   * @param {string} name
   * @returns {Map}
   */
  findTaggedServiceIds (name) {
    const taggedServices = new Map()
    for (const [id, definition] of this._definitions) {
      if (definition.tags.some((tag) => { return tag.name === name })) {
        taggedServices.set(id, definition)
      }
    }

    return taggedServices
  }

  /**
   * @param {string} key
   * @param {string||Array|boolean|Object} value
   */
  setParameter (key, value) {
    if (this._parameters.has(key)) { // do not allow register same IDs
      return
    }

    if (typeof value !== 'string' && !Array.isArray(value) &&
      typeof value !== 'boolean' && typeof value !== 'object') {
      throw new TypeError(
        'The expected value is not a flat string, an array, a boolean or an object')
    }

    this._parameters.set(key, value)
  }

  /**
   * @param {string} key
   * @returns {string|Array}
   */
  getParameter (key) {
    return this._parameters.get(key)
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  hasParameter (key) {
    return this._parameters.has(key)
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  hasDefinition (key) {
    return this._definitions.has(key)
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  has (key) {
    return this._definitions.has(key) || this._parameters.has(key) ||
      this._alias.has(key)
  }

  /**
   * @param {string} method
   * @param {string} key
   * @returns {Definition|boolean}
   * @private
   */
  _definition (method, key) {
    if (this._definitions.has(key)) {
      return this._definitions[method](key)
    }

    throw new DefinitionNotFoundException(key)
  }

  /**
   * @param {string} key
   * @returns {Definition}
   */
  getDefinition (key) {
    return this._definition('get', key)
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  removeDefinition (key) {
    return this._definition('delete', key)
  }

  /**
   * @param {string} key
   * @returns {Definition}
   */
  findDefinition (key) {
    key = this._alias.get(key) || key

    if (this._definitions.has(key)) {
      return this._definitions.get(key)
    }

    throw new DefinitionNotFoundException(key)
  }

  /**
   * @param {*} extension
   */
  registerExtension (extension) {
    if (typeof extension.load !== 'function') {
      throw new LoadMethodNotFoundException(extension.constructor.name)
    }

    this._extensions.push(extension)
  }

  /**
   * @param {string} id
   * @param {*} instance
   */
  set (id, instance) {
    if (this._container.has(id)) { // do not allow set same id
      return
    }
    this._container.set(id, instance)
  }

  /**
   * @param {string} id
   */
  remove (id) {
    this._container.delete(id)
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  isSet (id) {
    return this._container.has(id)
  }

  bootstrap () {
    const keys = [].concat(
      Array.from(this._container.keys()),
      Array.from(this._definitions.keys())
    )
    for (const id of keys) {
      this.get(id)
    }
  }

  asyncBootstrap () {
    const kkeys = []
      .concat(
        Array.from(this._container.keys()),
        Array.from(this._definitions.keys())
      )
    const keys = kkeys.filter((item, pos) => kkeys.indexOf(item) === pos)
    let countBeans = 0
    for (const id of keys) {
      this.waitAndGet(id).then(() => ++countBeans)
    }
    return waitUntil(() => countBeans >= keys.length, { timeout: 600000, intervalBetweenAttempts: 5000 })
  }

  /**
   * (for "synthetic" instance only) remove current definition and set new instance, shortcut of "remove-then-register"
   * @param {string} id
   * @param {*} instance
   */
  registerSyntheticAndSet (id, instance) {
    if (this._container.has(id)) {
      this.remove(id)
    }
    if (this._definitions.has(id)) {
      this._definitions.delete(id)
    }

    this.register(id).synthetic = true
    this._container.set(id, instance)
  }

  waitAndGet (id, opts) {
    opts = opts || { timeout: 600000, intervalBetweenAttempts: 5000 }
    return waitUntil(() => {
      let bean
      try { bean = this.get(id) } catch {}
      return bean
    }, opts)
  }

  getOrDefault (id, dfault) {
    try { return this.get(id) } catch {}
    return dfault
  }

  clear () {
    try { this._container.clear() } catch {}
    try { this._definitions.clear() } catch {}
    try { this._parameters.clear() } catch {}
    try { this._alias.clear() } catch {}
  }
}

export default ContainerBuilder
