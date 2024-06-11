// partially transcrypt'ed from Python, 2024-04-23 12:16:45 -> https://www.transcrypt.org/
import {AssertionError, AttributeError, BaseException, DeprecationWarning, Exception, IndexError, IterableError, KeyError, NotImplementedError, RuntimeWarning, StopIteration, UserWarning, ValueError, Warning, __JsIterator__, __PyIterator__, __Terminal__, __add__, __and__, __call__, __class__, __envir__, __eq__, __floordiv__, __ge__, __get__, __getcm__, __getitem__, __getslice__, __getsm__, __gt__, __i__, __iadd__, __iand__, __idiv__, __ijsmod__, __ilshift__, __imatmul__, __imod__, __imul__, __in__, __init__, __ior__, __ipow__, __irshift__, __isub__, __ixor__, __jsUsePyNext__, __jsmod__, __k__, __kwargtrans__, __le__, __lshift__, __lt__, __matmul__, __mergefields__, __mergekwargtrans__, __mod__, __mul__, __ne__, __neg__, __nest__, __or__, __pow__, __pragma__, __pyUseJsNext__, __rshift__, __setitem__, __setproperty__, __setslice__, __sort__, __specialattrib__, __sub__, __super__, __t__, __terminal__, __truediv__, __withblock__, __xor__, abs, all, any, assert, bool, bytearray, bytes, callable, chr, copy, deepcopy, delattr, dict, dir, divmod, enumerate, filter, float, getattr, hasattr, input, int, isinstance, issubclass, len, list, map, max, min, object, ord, pow, print, property, py_TypeError, py_iter, py_metatype, py_next, py_reversed, py_typeof, range, repr, round, setattr, sorted, str, sum, tuple, zip, isEmpty} from './org.transcrypt.__runtime__.js';
let __name__ = '__main__';
export let aws_resource_prefix = 'arn:aws:s3:::';
export let common_bucket_actions = ['s3:GetBucketLocation'];
export let read_only_bucket_actions = ['s3:ListBucket'];
export let write_only_bucket_actions = ['s3:ListBucketMultipartUploads'];
export let read_only_object_actions = ['s3:GetObject'];
export let write_only_object_actions = [
	's3:AbortMultipartUpload',
	's3:DeleteObject',
	's3:ListMultipartUploadParts',
	's3:PutObject'
];
export let read_write_object_actions = read_only_object_actions.concat(write_only_object_actions);
export let valid_actions = Array.prototype.concat.apply([], [common_bucket_actions, read_only_bucket_actions, write_only_bucket_actions, read_only_object_actions, write_only_object_actions]);
export let bucket_policy_none = 'none';
export let bucket_policy_read_only = 'readonly';
export let bucket_policy_read_write = 'readwrite';
export let bucket_policy_write_only = 'writeonly';
export let diff = function (a, b) {
	return a.filter(x => !b.includes(x));
};
export let union = function (a, b) {
	for (let e of b) {
		if (!__in__(e, a)) {
			a.append(e);
		}
	}
	return a;
};
export let intersection = function (a, b) {
	return a.filter(x => b.includes(x));
};
export let new_bucket_statement = function (policy, bucket_name, prefix) {
	let statements = [];
	if (policy == bucket_policy_none || bucket_name == '') {
		return statements;
	}
	let statement = dict({'Action': ['s3:GetBucketLocation'], 'Effect': 'Allow', 'Principal': dict({'AWS': ['*']}), 'Resource': ['arn:aws:s3:::{}'.format(bucket_name)], 'Sid': ''});
	statements.append (statement);
	if (policy == bucket_policy_read_only || policy == bucket_policy_read_write) {
		let statement = dict({'Action': ['s3:ListBucket'], 'Effect': 'Allow', 'Principal': dict({'AWS': ['*']}), 'Resource': ['arn:aws:s3:::{}'.format(bucket_name)], 'Sid': ''});
		if (prefix != '') {
			statement ['Condition'] = dict({'StringEquals': dict({'s3:prefix': [prefix]})});
		}
		statements.append(statement);
	}
	if (policy == bucket_policy_write_only || policy == bucket_policy_read_write) {
		let statement = dict({'Action': ['s3:ListBucketMultipartUploads'], 'Effect': 'Allow', 'Principal': dict({'AWS': ['*']}), 'Resource': ['arn:aws:s3:::{}'.format(bucket_name)], 'Sid': ''});
		statements.append(statement);
	}
	return statements;
};
export let new_object_statement = function (policy, bucket_name, prefix) {
	let statements = [];
	if (policy == bucket_policy_none || bucket_name == '') {
		return statements;
	}
	let statement = dict({'Effect': 'Allow', 'Principal': dict({'AWS': ['*']}), 'Resource': ['arn:aws:s3:::{}/{}*'.format(bucket_name, prefix)], 'Sid': ''});
	if (policy == bucket_policy_read_only) {
		statement['Action'] = read_only_object_actions;
	}
	else if (policy == bucket_policy_write_only) {
		statement['Action'] = write_only_object_actions;
	}
	else if (policy == bucket_policy_read_write) {
		statement['Action'] = read_write_object_actions;
	}
	statements.append(statement);
	return statements;
};
export let new_statements = function (policy, bucket_name, prefix) {
	let statements = [];
	let ns = new_bucket_statement(policy, bucket_name, prefix);
	statements.extend(ns);
	ns = new_object_statement(policy, bucket_name, prefix);
	statements.extend(ns);
	return statements;
};
export let starts_with_func = function (resource, resource_prefix) {
	return list(filter((function __lambda__ (x) {
		return x.startswith(resource_prefix);
	}), resource));
};
export let get_in_use_policy = function (statements, bucket_name, prefix) {
	let resource_prefix = (aws_resource_prefix + bucket_name) + '/';
	let object_resource = (((aws_resource_prefix + bucket_name) + '/') + prefix) + '*';
	let read_only_in_use = false;
	let write_only_in_use = false;
	for (let s of statements) {
		if (!__in__(object_resource, s['Resource']) && !(starts_with_func(s['Resource'], resource_prefix))) {
			if (intersection(s['Action'], read_only_object_actions).__eq__(read_only_object_actions)) {
				read_only_in_use = true;
			}
			if (intersection(s['Action'], write_only_object_actions).__eq__(write_only_object_actions)) {
				write_only_in_use = true;
			}
		}
		if (read_only_in_use && write_only_in_use) { 
			break;
		}
	}
	return tuple([read_only_in_use, write_only_in_use]);
};
export let merge_condition_map = function (cond_map1, cond_map2) {
	let out = dict({});
	for (let [k, v] of cond_map1.py_items ()) {
		out[k] = copy_condition_key_map(v);
	}
	for (let [k, v] of cond_map2.py_items()) {
		if (__in__ (k, out)) {
			out [k] = merge_condition_key_map(out [k], v);
		}
		else {
			out [k] = copy_condition_key_map(v);
		}
	}
	return out;
};
export let copy_condition_key_map = function (cond_key_map) {
	return dict(cond_key_map);
};
export let merge_condition_key_map = function (cond_key_map1, cond_key_map2) {
	let merged_map = dict (cond_key_map1);
	for (let [k, v] of cond_key_map2.py_items ()) {
		merged_map [k] = v;
	}
	return merged_map;
};

// https://stackoverflow.com/questions/8572826/generic-deep-diff-between-two-objects
export let deep_diff_mapper = function () {
  return {
    VALUE_CREATED: 'created',
    VALUE_UPDATED: 'updated',
    VALUE_DELETED: 'deleted',
    VALUE_UNCHANGED: 'unchanged',
    map: function(obj1, obj2) {
      if (this.isFunction(obj1) || this.isFunction(obj2)) {
        throw 'Invalid argument. Function given, object expected.';
      }
      if (this.isValue(obj1) || this.isValue(obj2)) {
        if (this.compareValues(obj1, obj2) == this.VALUE_UNCHANGED) return false;
		return true;
      }

      let diff = {};
      for (let key in obj1) {
        if (this.isFunction(obj1[key])) {
          continue;
        }

        let value2 = undefined;
        if (obj2[key] !== undefined) {
          value2 = obj2[key];
        }

        diff[key] = this.map(obj1[key], value2);
      }
      for (let key in obj2) {
        if (this.isFunction(obj2[key]) || diff[key] !== undefined) {
          continue;
        }

        diff[key] = this.map(undefined, obj2[key]);
      }

      return diff;

    },
    compareValues: function (value1, value2) {
      if (value1 === value2) {
        return this.VALUE_UNCHANGED;
      }
      if (this.isDate(value1) && this.isDate(value2) && value1.getTime() === value2.getTime()) {
        return this.VALUE_UNCHANGED;
      }
      if (value1 === undefined) {
        return this.VALUE_CREATED;
      }
      if (value2 === undefined) {
        return this.VALUE_DELETED;
      }
      return this.VALUE_UPDATED;
    },
    isFunction: function (x) {
      return Object.prototype.toString.call(x) === '[object Function]';
    },
    isArray: function (x) {
      return Object.prototype.toString.call(x) === '[object Array]';
    },
    isDate: function (x) {
      return Object.prototype.toString.call(x) === '[object Date]';
    },
    isObject: function (x) {
      return Object.prototype.toString.call(x) === '[object Object]';
    },
    isValue: function (x) {
      return !this.isObject(x) && !this.isArray(x);
    }
  }
}();

export let lists_are_equal = function(a, b) {
	let setA = new Set(a);
	let setB = new Set(b);

    if (setA.size === setB.size && [...setA].every((x) => setB.has(x))) {
		return true;
	}

	return false;
};

export let condition_equal = function(condition1, condition2) {
	if (!__in__('Condition', condition1) && !__in__('Condition', condition2)) {
		return true;
	}

	if (__in__('Condition', condition1) && __in__('Condition', condition2) && deep_diff_mapper.map(condition1['Condition'], condition2['Condition'])) {
		return true;
	}

	return false;
}
export let append_statement = function (statements, statement) {
	for (let [i, s] of enumerate(statements)) {
		if (lists_are_equal(s['Action'], statement['Action']) &&
			s['Effect'] == statement['Effect'] &&
			lists_are_equal(s['Principal']['AWS'], statement['Principal']['AWS']) &&
			condition_equal(s, statement)
		) {
			statements[i]['Resource'] = union(s['Resource'], statement['Resource']);
			return statements;
		} else if (
			lists_are_equal(s['Resource'], statement['Resource']) &&
			lists_are_equal(s['Effect'], statement['Effect']) &&
			lists_are_equal(s['Principal']['AWS'], statement['Principal']['AWS']) &&
			condition_equal(s, statement)) {
			statements[i]['Action'] = union(s['Action'], statement['Action']);
			return statements;
		}

		if (
			intersection(s['Resource'], statement['Resource']).__eq__(statement['Resource']) &&
			intersection(s['Action'], statement['Action']).__eq__(statement['Action']) &&
			s['Effect'] == statement['Effect'] &&
			intersection(s['Principal']['AWS'], statement['Principal']['AWS']).__eq__(statement['Principal']['AWS'])
		) {
			if (condition_equal(s, statement)) {
				return statements;
			}
			if (__in__('Condition', s) && s['Condition'] !== null && __in__('Condition', statement) && statement['Condition'] !== null) {
				if (lists_are_equal(s['Resource'], statement['Resource'])) {
					statements[i]['Condition'] = merge_condition_map(s['Condition'], statement['Condition']);
					return statements;
				}
			}
		}
	}
	if (isinstance(statement['Action'], list) && isinstance(statement['Resource'], list) && len(statement['Action']) > 0 && len(statement['Resource']) > 0) {
		statements.append(statement);
	}
	return statements;
};
export let append_statements = function (statements, append_statements) {
	let _statements = list(statements);
	for (let s of append_statements) {
		_statements = append_statement(_statements, s);
	}
	return _statements;
};
export let set_policy = function (statements, policy, bucket_name, prefix) {
	let out = remove_statements(statements, bucket_name, prefix);
	let ns = new_statements(policy, bucket_name, prefix);
	let rv = append_statements(out, ns);
	return rv;
};
export let is_valid_statement = function(statement, bucket_name) {
	if (!(intersection(statement ['Action'], valid_actions))) {
		return false;
	}
	if (statement['Effect'] != 'Allow') {
		return false;
	}
	if (!__in__('AWS', statement['Principal']) || !__in__('*', statement['Principal']['AWS'])) {
		return false;
	}
	let bucket_resource = aws_resource_prefix + bucket_name;
	if (__in__(bucket_resource, statement['Resource'])) {
		return true;
	}
	if (!(any((function () {
		let __accu0__ = [];
		for (let resource of statement['Resource']) {
			__accu0__.append(resource.startswith(bucket_resource + '/'));
		}
		return py_iter(__accu0__);
	}) ()))) {
		return false;
	}
	return true;
};
export let remove_bucket_actions = function(statement, prefix, bucket_resource, read_only_in_use, write_only_in_use) {
	let remove_read_only = function () {
		if (!intersection(statement['Action'], read_only_bucket_actions).__eq__(read_only_bucket_actions)) {
			return ;
		}
		if (!(__in__('Condition', statement)) || statement['Condition'] === null) {
			statement['Action'] = diff(statement['Action'], read_only_bucket_actions);
			return ;
		}
		if (prefix != '') {
			let string_equals_value = __in__('StringEquals', statement['Condition']) ? statement['Condition']['StringEquals'] : {};
			let py_values = [];
			if (string_equals_value) {
				py_values = string_equals_value['s3:prefix'];
				if (py_values === null) {
					py_values = [];
				}
			}
			if (__in__(prefix, py_values)) {
				py_values.remove(prefix);
			}
			if (string_equals_value) {
				if (len(py_values) == 0) {
					delete string_equals_value['s3:prefix'];
				}
				if (isEmpty(string_equals_value)) {
					delete statement['Condition']['StringEquals'];
				}
			}
			if (__in__('Condition', statement) && isEmpty(statement['Condition'])) {
				statement['Condition'] = null;
				statement['Action'] = diff(statement['Action'], read_only_bucket_actions);
			}
		}
	};
	let remove_write_only = function () {
		if (__in__('Condition', statement) && statement['Condition'] === null) {
			statement['Action'] = diff(statement ['Action'], write_only_bucket_actions);
		}
	};
	if (len(statement['Resource']) > 1) {
		if (__in__(bucket_resource, statement['Resource'])) {
			statement['Resource'].remove(bucket_resource);
		}
	}
	else {
		if (!(read_only_in_use)) {
			remove_read_only();
		}
		if (!(write_only_in_use)) {
			remove_write_only();
		}
	}
	return statement;
};
export let remove_object_actions = function (statement, object_resource) {
	if (!(__in__('Condition', statement)) || statement['Condition'] === null) {
		if (len(statement['Resource']) > 1) {
			if (__in__(object_resource, statement ['Resource'])) {
				statement['Resource'].remove(object_resource);
			}
		}
		else {
			statement['Action'] = diff(statement['Action'], read_only_object_actions);
			statement['Action'] = diff(statement['Action'], write_only_object_actions);
		}
	}
	return statement;
};
export let remove_statements = function(statements, bucket_name, prefix) {
	let bucket_resource = aws_resource_prefix + bucket_name;
	let object_resource = (((aws_resource_prefix + bucket_name) + '/') + prefix) + '*';
	let __left0__ = get_in_use_policy(statements, bucket_name, prefix);
	let read_only_in_use = __left0__[0];
	let write_only_in_use = __left0__[1];
	let out = [];
	let read_only_bucket_statements = [];
	let s3_prefix_values = new Set();
	for (let statement of statements) {
		if (!(is_valid_statement(statement, bucket_name))) {
			out.append(statement);
			continue;
		}
		if (__in__(bucket_resource, statement['Resource'])) {
			if (__in__('Condition', statement) && statement['Condition'] !== null) {
				statement = remove_bucket_actions(statement, prefix, bucket_resource, false, false);
			}
			else {
				statement = remove_bucket_actions(statement, prefix, bucket_resource, read_only_in_use, write_only_in_use);
			}
		}
		else if (__in__(object_resource, statement['Resource'])) {
			statement = remove_object_actions(statement, object_resource);
		}
		if (isinstance(statement['Action'], list) && len(statement['Action']) > 0) {
			if (__in__(bucket_resource, statement['Resource']) && intersection(statement['Action'], read_only_bucket_actions).__eq__(read_only_bucket_actions) && statement['Effect'] == 'Allow' && __in__('*', statement['Principal']['AWS'])) {
				if (__in__('Condition', statement) && statement['Condition'] !== null) {
					let string_equals_value = statement['Condition']['StringEquals'];
					let py_values = [];
					if (string_equals_value !== null) {
						py_values = string_equals_value['s3:prefix'];
						if (py_values === null) {
							py_values = [];
						}
					}

					py_values.map(x => bucket_resource + '/' + x + '*');

					s3_prefix_values = s3_prefix_values.union(new Set(py_values));
				} else if (s3_prefix_values.size > 0) {
					read_only_bucket_statements.append(statement);
					continue;
				}
			}
			out.append(statement);
		}
	}
	let skip_bucket_statement = true;
	let resource_prefix = (aws_resource_prefix + bucket_name) + '/';
	for (let statement of out) {
		if (any(starts_with_func(statement['Resource'], resource_prefix)) && s3_prefix_values.intersection(new Set(statement['Resource'])).size == 0) {
			skip_bucket_statement = false;
			break;
		}
	}
	for (let statement of read_only_bucket_statements) {
		if (skip_bucket_statement && __in__(bucket_resource, statement['Resource']) && statement['Effect'] == 'Allow' &&
			__in__('*', statement['Principal']['AWS']) && statement['Condition'] === null) {
			continue;
		}
		out.append(statement);
	}
	if (len(out) == 1) {
		let statement = out[0];
		if (
			__in__(bucket_resource, statement['Resource']) &&
			intersection(statement['Action'], common_bucket_actions).__eq__(common_bucket_actions) &&
			statement['Effect'] == 'Allow' &&
			__in__('*', statement['Principal']['AWS']) &&
			(!('Condition' in statement) || statement['Condition'] === null)
		) {
			out = [];
		}
	}
	return out;
};

//# sourceMappingURL=s3_acl_utils.map