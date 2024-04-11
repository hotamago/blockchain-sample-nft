class BaseElement {
  key = "";
  value = "";
  constructor(key, value) {
    this.key = key;
    this.value = value;
  }
}
class BaseStruct {
  data = [];
  constructor(data) {
    // Check data is array
    if (!Array.isArray(data)) {
      console.error("Error data is not array");
      return;
    }
    // Check if data is type of BaseElement
    for (let i = 0; i < data.length; i++) {
      if (data[i] instanceof BaseElement) {
        this.data.push(data[i]);
      } else {
        console.error("Error data is not BaseElement");
        return;
      }
    }
    // Set data to struct
    this.data = data;

    // Set prototype
    Object.setPrototypeOf(this, BaseStruct.prototype);
  }
  // Get value from key
  get(key) {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i].key == key) {
        return this.data[i].value;
      }
    }
    console.error("Error key not found");
  }
  // Set value to key
  set(key, value) {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i].key == key) {
        this.data[i].value = value;
        return;
      }
    }
    console.error("Error key not found");
  }
  // Convert object to struct
  object2struct(object) {
    for (let i = 0; i < this.data.length; i++) {
      if (
        typeof object[this.data[i].key] == "number" &&
        typeof this.data[i].value == "number"
      ) {
        this.data[i].value = object[this.data[i].key];
      } else if (
        typeof object[this.data[i].key] == "object" &&
        this.data[i].value instanceof BaseStruct
      ) {
        this.data[i].value.object2struct(object[this.data[i].key]);
      } else {
        console.error("Error object is not number or struct");
      }
    }
  }
  // Convert struct to object
  struct2object() {
    let object = {};
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i].value instanceof BaseStruct) {
        object[this.data[i].key] = this.data[i].value.struct2object();
      } else {
        object[this.data[i].key] = this.data[i].value;
      }
    }
    return object;
  }
  // Caculate size of buffer
  size() {
    let size = 0;
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i].value instanceof BaseStruct) {
        size += this.data[i].value.size();
      } else {
        size++;
      }
    }
    return size;
  }
  // De and Se
  desirialize(buffers, index = 0) {
    return this._desirialize(this.data, buffers, index);
  }
  serialize() {
    return this._serialize(this.data);
  }
  // Desirialize data from buffer
  _desirialize(dataStuct, buffers, index) {
    // Set data from fields to each field in struct
    for (let i = 0; i < dataStuct.length; i++) {
      if (dataStuct[i].value instanceof BaseStruct) {
        index = dataStuct[i].value.desirialize(buffers, index);
      } else if (typeof dataStuct[i].value === "number") {
        dataStuct[i].value = buffers[index];
        index++;
      } else {
        console.error("Error data struct is not number or struct");
      }
    }
    return index;
  }
  // Serialize data to buffer Uint8Array
  _serialize(dataStuct) {
    let buffer = [];
    for (let i = 0; i < dataStuct.length; i++) {
      if (dataStuct[i].value instanceof BaseStruct) {
        buffer.push(...dataStuct[i].value.serialize());
      } else if (typeof dataStuct[i].value === "number") {
        buffer.push(dataStuct[i].value);
      } else {
        console.error("Error data struct is not number or struct");
      }
    }
    return buffer;
  }
}

// Base data type

// Uint 8
class HotaUint8 extends BaseStruct {
  constructor(inUint = 0) {
    super([new BaseElement("value", inUint)]);

    // Set prototype
    Object.setPrototypeOf(this, HotaUint8.prototype);
  }

  // Get value
  value() {
    return this.get("value");
  }

  // Set value
  setValue(inUint) {
    this.set("value", inUint);
  }
}

// Array int data
class HotaArrayInt extends BaseStruct {
  constructor(len, inArray = [], defaultData = 0) {
    let data = [];
    for (let i = 0; i < len; i++) {
      if (i < inArray.length) {
        data.push(new BaseElement(i, inArray[i]));
      } else {
        data.push(new BaseElement(i, new HotaUint8(defaultData)));
      }
    }
    super(data);

    // Set prototype
    Object.setPrototypeOf(this, HotaArrayInt.prototype);
  }
}

// Uint 16
class HotaUint16 extends BaseStruct {
  constructor(inUint = 0) {
    // Convert to array
    let inArray = [inUint & 0xff, (inUint >> 8) & 0xff];
    super([new BaseElement("value", new HotaArrayInt(2, inArray, 0))]);

    // Set prototype
    Object.setPrototypeOf(this, HotaUint16.prototype);
  }

  // Get value
  value() {
    return this.get("value").get(0) + this.get("value").get(1) * 256;
  }

  // Set value
  setValue(inUint) {
    this.set("value", inUint & 0xff);
    this.set("value", (inUint >> 8) & 0xff);
  }

  // Struct to object
  struct2object() {
    return this.value();
  }
  // Object to struct
  object2struct(object) {
    this.setValue(object);
  }
}

// Uint 32
class HotaUint32 extends BaseStruct {
  constructor(inUint = 0) {
    // Convert to array
    let inArray = [
      inUint & 0xff,
      (inUint >> 8) & 0xff,
      (inUint >> 16) & 0xff,
      (inUint >> 24) & 0xff,
    ];
    super([new BaseElement("value", new HotaArrayInt(4, inArray, 0))]);

    // Set prototype
    Object.setPrototypeOf(this, HotaUint32.prototype);
  }

  // Get value
  value() {
    return (
      this.get("value").get(0) +
      this.get("value").get(1) * 256 +
      this.get("value").get(2) * 256 * 256 +
      this.get("value").get(3) * 256 * 256 * 256
    );
  }

  // Set value
  setValue(inUint) {
    this.set("value", inUint & 0xff);
    this.set("value", (inUint >> 8) & 0xff);
    this.set("value", (inUint >> 16) & 0xff);
    this.set("value", (inUint >> 24) & 0xff);
  }

  // Struct to object
  struct2object() {
    return this.value();
  }
  // Object to struct
  object2struct(object) {
    this.setValue(object);
  }
}

// Uint 64
class HotaUint64 extends BaseStruct {
  constructor(inUint = 0) {
    // Convert to array
    let inArray = [
      inUint & 0xff,
      (inUint >> 8) & 0xff,
      (inUint >> 16) & 0xff,
      (inUint >> 24) & 0xff,
      (inUint >> 32) & 0xff,
      (inUint >> 40) & 0xff,
      (inUint >> 48) & 0xff,
      (inUint >> 56) & 0xff,
    ];
    super([new BaseElement("value", new HotaArrayInt(8, inArray, 0))]);

    // Set prototype
    Object.setPrototypeOf(this, HotaUint64.prototype);
  }

  // Get value
  value() {
    return (
      this.get("value").get(0) +
      this.get("value").get(1) * 256 +
      this.get("value").get(2) * 256 * 256 +
      this.get("value").get(3) * 256 * 256 * 256 +
      this.get("value").get(4) * 256 * 256 * 256 * 256 +
      this.get("value").get(5) * 256 * 256 * 256 * 256 * 256 +
      this.get("value").get(6) * 256 * 256 * 256 * 256 * 256 * 256 +
      this.get("value").get(7) * 256 * 256 * 256 * 256 * 256 * 256 * 256
    );
  }

  // Set value
  setValue(inUint) {
    this.set("value", inUint & 0xff);
    this.set("value", (inUint >> 8) & 0xff);
    this.set("value", (inUint >> 16) & 0xff);
    this.set("value", (inUint >> 24) & 0xff);
    this.set("value", (inUint >> 32) & 0xff);
    this.set("value", (inUint >> 40) & 0xff);
    this.set("value", (inUint >> 48) & 0xff);
    this.set("value", (inUint >> 56) & 0xff);
  }

  // Struct to object
  struct2object() {
    return this.value();
  }
  // Object to struct
  object2struct(object) {
    this.setValue(object);
  }
}

// String 64bit data
class HotaString64 extends HotaArrayInt {
  constructor(len, inString = "") {
    this.alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let inArray = [];
    for (let i = 0; i < inString.length; i++) {
      // Check vaild char
      if (this.alphabet.indexOf(inString[i]) == -1) {
        console.error("Error invalid char");
        return;
      }
      inArray.push(this.alphabet.indexOf(inString[i]) + 1);
    }
    super(len, inArray, 0);

    // Set prototype
    Object.setPrototypeOf(this, HotaString64.prototype);
  }
  toString() {
    let str = "";
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i].value == 0) {
        break;
      }
      str += this.alphabet[this.data[i].value - 1];
    }
    return str;
  }

  // Struct to object
  struct2object() {
    return this.toString();
  }
  // Object to struct
  object2struct(object) {
    // Reset data
    for (let i = 0; i < this.data.length; i++) {
      this.data[i].value = 0;
    }
    // Set data
    for (let i = 0; i < object.length; i++) {
      this.data[i].value = this.alphabet.indexOf(object[i]) + 1;
    }
  }
}

// Array of struct
class HotaArrayStruct extends BaseStruct {
  constructor(len, lamdaCreateObj, inArray = []) {
    // Check lamdaCreateObj is function
    if (typeof lamdaCreateObj !== "function") {
      console.error("Error lamdaCreateObj is not function");
      return;
    }
    if (!(lamdaCreateObj() instanceof BaseStruct)) {
      console.error("Error struct is not BaseStruct");
      return;
    }
    let data = [];
    for (let i = 0; i < len; i++) {
      if (i < inArray.length) {
        data.push(new BaseElement(i, inArray[i]));
      } else {
        data.push(new BaseElement(i, lamdaCreateObj()));
      }
    }
    super(data);

    // Set prototype
    Object.setPrototypeOf(this, HotaArrayStruct.prototype);
  }
}

// Vector of struct
class HotaVectorStruct extends BaseStruct {
  constructor(
    maxlen,
    lamdaCreateObj,
    inArray = [],
    UintLen = new HotaUint8(0)
  ) {
    // Check lamdaCreateObj is function
    if (typeof lamdaCreateObj !== "function") {
      console.error("Error lamdaCreateObj is not function");
      return;
    }
    if (!(lamdaCreateObj() instanceof BaseStruct)) {
      console.error("Error struct is not BaseStruct");
      return;
    }

    let data = [];
    data.push(new BaseElement("length", UintLen));
    data.push(
      new BaseElement(
        "data",
        new HotaArrayStruct(maxlen, lamdaCreateObj, inArray)
      )
    );
    super(data);

    // Set prototype
    Object.setPrototypeOf(this, HotaVectorStruct.prototype);
  }

  // Add new element to vector
  push(newObj) {
    this.data[1].data[this.data[0].value].object2struct(newObj);
    this.data[0].value++;
  }
  // Pop element from vector
  pop() {
    this.data[0].value--;
  }
  // Remove element from vector
  remove(index) {
    for (let i = index; i < this.data[0].value - 1; i++) {
      this.data[1].data[i] = this.data[1].data[i + 1];
    }
    this.data[0].value--;
  }
  // Get element from vector
  getByIndex(index) {
    return this.get("data").get(index);
  }
  // Get size of vector
  length() {
    return this.data.get("length");
  }
  // Clear vector
  clear() {
    this.data[0].value = 0;
  }
  // Check vector is empty
  isEmpty() {
    return this.data[0].value == 0;
  }
}
