(module
  (memory (export "memory") 2)
  (func (export "process")
    (param $ptr i32)
    (param $len i32)
    (param $width i32)
    (param $height i32)
    (param $amount i32)
    (local $end i32)
    (local $vectorEnd i32)

    (local.set $end (i32.add (local.get $ptr) (local.get $len)))
    (local.set $vectorEnd
      (i32.sub
        (local.get $end)
        (i32.and (local.get $len) (i32.const 15))))

    ;; Four RGBA pixels per instruction. The alpha byte in every lane is kept.
    (block $vectorDone
      (loop $vectorLoop
        (br_if $vectorDone
          (i32.ge_u (local.get $ptr) (local.get $vectorEnd)))
        (v128.store
          (local.get $ptr)
          (v128.xor
            (v128.load (local.get $ptr))
            (v128.const i32x4
              16777215 16777215 16777215 16777215)))
        (local.set $ptr (i32.add (local.get $ptr) (i32.const 16)))
        (br $vectorLoop)))

    ;; Pixel buffers are RGBA-aligned. This covers a final 1-3 pixels.
    (block $tailDone
      (loop $tailLoop
        (br_if $tailDone (i32.ge_u (local.get $ptr) (local.get $end)))
        (i32.store8
          (local.get $ptr)
          (i32.sub (i32.const 255) (i32.load8_u (local.get $ptr))))
        (i32.store8 offset=1
          (local.get $ptr)
          (i32.sub (i32.const 255) (i32.load8_u offset=1 (local.get $ptr))))
        (i32.store8 offset=2
          (local.get $ptr)
          (i32.sub (i32.const 255) (i32.load8_u offset=2 (local.get $ptr))))
        (local.set $ptr (i32.add (local.get $ptr) (i32.const 4)))
        (br $tailLoop)))))
