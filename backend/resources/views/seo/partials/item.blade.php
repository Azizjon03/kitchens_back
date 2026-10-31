<div class="item">
    <div>
        <div>{{ $item->name_uz }}</div>
        @if ($item->description_uz)<div class="muted small">{{ $item->description_uz }}</div>@endif
    </div>
    <div class="p">{{ $fmt($item->price) }} so'm{{ $item->sell_type === 'weight' ? ' / kg' : '' }}</div>
</div>
