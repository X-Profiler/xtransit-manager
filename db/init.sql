-- template: `process-${MM-DD}`
DROP TABLE IF EXISTS `process`;
CREATE TABLE `process`(
  `id` INT UNSIGNED AUTO_INCREMENT,
  `app` INT NOT NULL,
  `agent` VARCHAR(50) NOT NULL,
  `pid` INT NOT NULL,
  `uptime` INT UNSIGNED COMMENT 'prcess uptime (sec)',
  `log_time` DATETIME NOT NULL COMMENT 'process log created time on agent',
  `version` VARCHAR(50) NOT NULL COMMENT 'xprofiler version',

  -- cpu
  `cpu_now` FLOAT(5,2),
  `cpu_15` FLOAT(5,2),
  `cpu_30` FLOAT(5,2),
  `cpu_60` FLOAT(5,2),

  -- memory
  -- overview
  `rss` BIGINT,
  `heap_used` BIGINT UNSIGNED,
  `heap_available` BIGINT UNSIGNED,
  `heap_total` BIGINT UNSIGNED,
  `heap_limit` BIGINT UNSIGNED,
  `heap_executeable` BIGINT UNSIGNED,
  `total_physical_size` BIGINT UNSIGNED,
  `malloced_memory` BIGINT UNSIGNED,
  `amount_of_external_allocated_memory` BIGINT UNSIGNED,
  -- new space size
  `new_space_size` BIGINT UNSIGNED,
  `new_space_used` BIGINT UNSIGNED,
  `new_space_available` BIGINT UNSIGNED,
  `new_space_committed` BIGINT UNSIGNED,
  -- old space size
  `old_space_size` BIGINT UNSIGNED,
  `old_space_used` BIGINT UNSIGNED,
  `old_space_available` BIGINT UNSIGNED,
  `old_space_committed` BIGINT UNSIGNED,
  -- code space size
  `code_space_size` BIGINT UNSIGNED,
  `code_space_used` BIGINT UNSIGNED,
  `code_space_available` BIGINT UNSIGNED,
  `code_space_committed` BIGINT UNSIGNED,
  -- map space size
  `map_space_size` BIGINT UNSIGNED,
  `map_space_used` BIGINT UNSIGNED,
  `map_space_available` BIGINT UNSIGNED,
  `map_space_committed` BIGINT UNSIGNED,
  -- large object space size
  `lo_space_size` BIGINT UNSIGNED,
  `lo_space_used` BIGINT UNSIGNED,
  `lo_space_available` BIGINT UNSIGNED,
  `lo_space_committed` BIGINT UNSIGNED,
  -- read only space size
  `read_only_space_size` BIGINT UNSIGNED,
  `read_only_space_used` BIGINT UNSIGNED,
  `read_only_space_available` BIGINT UNSIGNED,
  `read_only_space_committed` BIGINT UNSIGNED,
  -- new large object space size
  `new_lo_space_size` BIGINT UNSIGNED,
  `new_lo_space_used` BIGINT UNSIGNED,
  `new_lo_space_available` BIGINT UNSIGNED,
  `new_lo_space_committed` BIGINT UNSIGNED,
  -- code large object space size
  `code_lo_space_size` BIGINT UNSIGNED,
  `code_lo_space_used` BIGINT UNSIGNED,
  `code_lo_space_available` BIGINT UNSIGNED,
  `code_lo_space_committed` BIGINT UNSIGNED,

  -- gc
  `total_gc_times` INT UNSIGNED COMMENT 'total count of gc',
  `total_gc_duration` INT UNSIGNED COMMENT 'total duration of gc',
  `total_scavange_duration` INT UNSIGNED COMMENT 'total scavange duration of gc',
  `total_marksweep_duration` INT UNSIGNED COMMENT 'total marksweep duration of gc',
  `total_incremental_marking_duration` INT UNSIGNED COMMENT 'total incremental marking duration of gc',
  `gc_time_during_last_record` INT UNSIGNED COMMENT 'duration of last gc',
  `scavange_duration_last_record` INT UNSIGNED COMMENT 'scavange duration of last gc',
  `marksweep_duration_last_record` INT UNSIGNED COMMENT 'marksweep duration of last gc',
  `incremental_marking_duration_last_record` INT UNSIGNED COMMENT 'incremental marking duration of last gc',

  -- uv handles
  `active_handles` INT UNSIGNED,
  `active_file_handles` INT UNSIGNED,
  `active_and_ref_file_handles` INT UNSIGNED,
  `active_tcp_handles` INT UNSIGNED,
  `active_and_ref_tcp_handles` INT UNSIGNED,
  `active_udp_handles` INT UNSIGNED,
  `active_and_ref_udp_handles` INT UNSIGNED,
  `active_timer_handles` INT UNSIGNED,
  `active_and_ref_timer_handles`  INT UNSIGNED,

  -- http
  `response_codes` VARCHAR(1024) DEFAULT '',
  `live_http_request` INT UNSIGNED,
  `http_response_close` INT UNSIGNED,
  `http_response_sent` INT UNSIGNED,
  `http_request_timeout` INT UNSIGNED,
  `http_patch_timeout` INT UNSIGNED,
  `http_rt` DOUBLE,

  `gm_modified` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `gm_create` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX (`app`, `agent`, `pid`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- template: `osinfo-${MM-DD}`
DROP TABLE IF EXISTS `osinfo`;
CREATE TABLE `osinfo`(
  `id` INT UNSIGNED AUTO_INCREMENT,
  `app` INT NOT NULL,
  `agent` VARCHAR(50) NOT NULL,
  `uptime` INT UNSIGNED NOT NULL COMMENT 'system uptime',
  `log_time` DATETIME NOT NULL COMMENT 'system log created time on agent',
  `position` TINYINT UNSIGNED NOT NULL COMMENT '0: from system_log, 1: from xprofiler_log',
  `version` VARCHAR(50) DEFAULT '' COMMENT 'xprofiler version',

  -- cpu
  `used_cpu` DOUBLE,
  `cpu_count` INT UNSIGNED,

  -- mem
  `total_memory` BIGINT UNSIGNED,
  `free_memory` BIGINT UNSIGNED,

  -- load
  `load1` DOUBLE,
  `load5` DOUBLE,
  `load15` DOUBLE,

  -- disks
  `disks` VARCHAR(1024),

  -- node count
  `node_count` INT UNSIGNED,

  -- gc
  `total_gc_times` INT UNSIGNED COMMENT 'total count of gc (all process)',
  `total_gc_duration` INT UNSIGNED COMMENT 'total duration of gc (all process)',
  `total_scavange_duration` INT UNSIGNED COMMENT 'total scavange duration of gc (all process)',
  `total_marksweep_duration` INT UNSIGNED COMMENT 'total marksweep duration of gc (all process)',
  `total_incremental_marking_duration` INT UNSIGNED COMMENT 'total incremental marking duration of gc (all process)',
  `gc_time_during_last_record` INT UNSIGNED COMMENT 'duration of last gc (all process)',
  `scavange_duration_last_record` INT UNSIGNED COMMENT 'scavange duration of last gc (all process)',
  `marksweep_duration_last_record` INT UNSIGNED COMMENT 'marksweep duration of last gc (all process)',
  `incremental_marking_duration_last_record` INT UNSIGNED COMMENT 'incremental marking duration of last gc (all process)',

  -- http
  `response_codes` VARCHAR(1024) DEFAULT '',
  `live_http_request` INT UNSIGNED,
  `http_response_close` INT UNSIGNED,
  `http_response_sent` INT UNSIGNED,
  `http_request_timeout` INT UNSIGNED,
  `http_patch_timeout` INT UNSIGNED,
  `http_rt` DOUBLE,

  `gm_modified` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `gm_create` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX (`app`, `agent`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- template: `alarm-${MM-DD}`
DROP TABLE IF EXISTS `alarm`;
CREATE TABLE `alarm`(
  `id` INT UNSIGNED AUTO_INCREMENT,
  `strategy` INT UNSIGNED NOT NULL,
  `agent` VARCHAR(50) NOT NULL,
  `message` VARCHAR(250) NOT NULL,
  `pid` INT DEFAULT NULL,
  `gm_modified` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `gm_create` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX (`strategy`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;
