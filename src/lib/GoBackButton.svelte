<script lang="ts">
  const goBack = () => {
    window.history.back();
  };
</script>

<button class="button" on:click={goBack}> Go back </button>
